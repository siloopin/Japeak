#!/usr/bin/env python3
"""
상용 한자 안키 덱(日本語__常用漢字.apkg)에서 한자와 뜻을 추출하여 
MySQL kanji_dictionary 테이블에 시드합니다.
사용법: python3 seed-kanji.py
"""

import zstandard
import sqlite3
import subprocess
import sys
import os
import re

ANKI_FILE = "/Users/wernger7/Downloads/JLPT Anki Decks/日本語__常用漢字.apkg"
TEMP_DIR = "/Users/wernger7/Japeak/backend/anki_kanji_temp"

# MySQL 접속 정보
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = "3306"
MYSQL_USER = "root"
MYSQL_PASS = "rootpassword"
MYSQL_DB = "japeak"

def ensure_table():
    """테이블이 없으면 생성합니다."""
    print("[1/4] 테이블 생성 확인 중...")
    sql = """
    CREATE TABLE IF NOT EXISTS kanji_dictionary (
      kanji VARCHAR(50) PRIMARY KEY,
      meaning VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """
    result = subprocess.run(
        [
            "mysql",
            "--default-character-set=utf8mb4",
            f"-h{MYSQL_HOST}",
            f"-P{MYSQL_PORT}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASS}",
            MYSQL_DB,
            "-e",
            sql
        ],
        capture_output=True,
        text=True
    )
    if result.returncode != 0:
        print(f"   ✗ 테이블 생성 실패: {result.stderr}")
        sys.exit(1)

def extract_anki_db():
    """apkg 파일에서 SQLite DB를 추출합니다."""
    print("[2/4] 상용 한자 안키 덱 파일 추출 중...")
    
    os.makedirs(TEMP_DIR, exist_ok=True)
    
    # apkg는 ZIP 파일이므로 unzip으로 추출
    subprocess.run(
        ["unzip", "-o", ANKI_FILE, "-d", TEMP_DIR],
        capture_output=True
    )
    
    # anki21b (zstd 압축) 파일을 디코딩
    anki21b_path = os.path.join(TEMP_DIR, "collection.anki21b")
    decoded_path = os.path.join(TEMP_DIR, "collection_decoded.anki21")
    
    if os.path.exists(anki21b_path):
        with open(anki21b_path, "rb") as f:
            dctx = zstandard.ZstdDecompressor()
            reader = dctx.stream_reader(f)
            decompressed = reader.read()
        
        with open(decoded_path, "wb") as f:
            f.write(decompressed)
        return decoded_path
    else:
        anki2_path = os.path.join(TEMP_DIR, "collection.anki2")
        if os.path.exists(anki2_path):
            return anki2_path
        else:
            print("   ✗ 안키 DB 파일을 찾을 수 없습니다!")
            sys.exit(1)

def parse_kanji(db_path):
    """SQLite DB에서 한자 데이터를 파싱합니다."""
    print("[3/4] 한자 데이터 파싱 중...")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    rows = cur.execute("SELECT flds FROM notes").fetchall()
    conn.close()
    
    kanjis = []
    seen = set()
    for row in rows:
        fields = row[0].split("\x1f")
        
        if len(fields) < 3:
            continue
        
        kanji = fields[1].strip()
        meaning = fields[2].strip()
        
        if not kanji or not meaning:
            continue
            
        kanji = re.sub(r"<[^>]+>", "", kanji).strip()
        meaning = re.sub(r"<[^>]+>", "", meaning).strip()
        
        if kanji not in seen:
            seen.add(kanji)
            kanjis.append({
                "kanji": kanji,
                "meaning": meaning
            })
    
    print(f"   → {len(kanjis)}개 한자 파싱 완료")
    return kanjis

def seed_to_mysql(kanjis):
    """파싱된 한자를 MySQL에 삽입합니다."""
    print("[4/4] MySQL에 시드 데이터 삽입 중...")
    
    sql_file = os.path.join(TEMP_DIR, "seed_kanji.sql")
    
    with open(sql_file, "w", encoding="utf-8") as f:
        f.write("DELETE FROM kanji_dictionary;\n")
        
        batch_size = 100
        for i in range(0, len(kanjis), batch_size):
            batch = kanjis[i:i+batch_size]
            f.write("INSERT INTO kanji_dictionary (kanji, meaning) VALUES\n")
            values = []
            for k in batch:
                kanji_esc = k["kanji"].replace("'", "''").replace("\\", "\\\\")
                meaning_esc = k["meaning"].replace("'", "''").replace("\\", "\\\\")
                values.append(f"  ('{kanji_esc}', '{meaning_esc}')")
            f.write(",\n".join(values))
            f.write(";\n\n")
            
    result = subprocess.run(
        [
            "mysql",
            "--default-character-set=utf8mb4",
            f"-h{MYSQL_HOST}",
            f"-P{MYSQL_PORT}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASS}",
            MYSQL_DB
        ],
        stdin=open(sql_file, "r", encoding="utf-8"),
        capture_output=True,
        text=True
    )
    
    if result.returncode != 0:
        print(f"   ✗ MySQL 실행 실패: {result.stderr}")
        sys.exit(1)
    
    print(f"   → MySQL에 {len(kanjis)}개 한자 삽입 완료!")

if __name__ == "__main__":
    ensure_table()
    db_path = extract_anki_db()
    kanjis = parse_kanji(db_path)
    seed_to_mysql(kanjis)
    print("✅ 상용 한자 시드 완료!")
