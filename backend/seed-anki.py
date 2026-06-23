#!/usr/bin/env python3
"""
안키 덱(JLPT 한끝 Voca)에서 단어를 추출하여 MySQL jlpt_words 테이블에 시드합니다.
사용법: python3 seed-anki.py
"""

import zstandard
import sqlite3
import subprocess
import sys
import os
import re

ANKI_FILE = "/Users/wernger7/Downloads/JLPT Anki Decks/日本語__JLPT 한끝 Voca.apkg"
TEMP_DIR = "/Users/wernger7/Japeak/backend/anki_temp"

# MySQL 접속 정보
MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = "3306"
MYSQL_USER = "root"
MYSQL_PASS = "rootpassword"
MYSQL_DB = "japeak"

def extract_anki_db():
    """apkg 파일에서 SQLite DB를 추출합니다."""
    print("[1/4] 안키 덱 파일 추출 중...")
    
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
        
        print(f"   → anki21b 파일 디코딩 완료 ({len(decompressed):,} bytes)")
        return decoded_path
    else:
        # anki2 파일 사용
        anki2_path = os.path.join(TEMP_DIR, "collection.anki2")
        if os.path.exists(anki2_path):
            return anki2_path
        else:
            print("   ✗ 안키 DB 파일을 찾을 수 없습니다!")
            sys.exit(1)

def parse_words(db_path):
    """SQLite DB에서 단어 데이터를 파싱합니다."""
    print("[2/4] 단어 데이터 파싱 중...")
    
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    rows = cur.execute("SELECT flds, tags FROM notes").fetchall()
    conn.close()
    
    words = []
    for row in rows:
        fields = row[0].split("\x1f")
        tags = row[1].strip()
        
        if len(fields) < 4:
            continue
        
        # 필드: [0]=ID, [1]=한자/단어, [2]=히라가나, [3]=한국어뜻, [4]=예문(선택), [5]=메모(선택)
        word = fields[1].strip()
        reading = fields[2].strip()
        meaning = fields[3].strip()
        
        if not word or not reading or not meaning:
            continue
        
        # HTML 태그 제거
        word = re.sub(r"<[^>]+>", "", word).strip()
        reading = re.sub(r"<[^>]+>", "", reading).strip()
        meaning = re.sub(r"<[^>]+>", "", meaning).strip()
        
        # 태그에서 레벨과 Day 추출
        # 태그 형식: "JLPT_한권으로끝내기::N5::Day01"
        level = "N5"  # 기본값
        day = "Day01"  # 기본값
        
        if "::N1::" in tags:
            level = "N1"
        elif "::N2::" in tags:
            level = "N2"
        elif "::N3::" in tags:
            level = "N3"
        elif "::N4::" in tags:
            level = "N4"
        elif "::N5::" in tags:
            level = "N5"
        
        # Day 추출
        day_match = re.search(r"(Day\d+|Dya\d+)", tags)
        if day_match:
            day = day_match.group(1)
            # 오타 수정: "Dya" -> "Day"
            day = day.replace("Dya", "Day")
        
        words.append({
            "level": level,
            "word": word,
            "reading": reading,
            "meaning": meaning,
            "day": day
        })
    
    print(f"   → {len(words)}개 단어 파싱 완료")
    
    # 레벨별 통계 출력
    from collections import Counter
    level_counts = Counter(w["level"] for w in words)
    for level in ["N5", "N4", "N3", "N2", "N1"]:
        print(f"      {level}: {level_counts.get(level, 0)}개")
    
    return words

def seed_to_mysql(words):
    """파싱된 단어를 MySQL에 삽입합니다."""
    print("[3/4] MySQL에 시드 데이터 삽입 중...")
    
    # SQL 파일 생성
    sql_file = os.path.join(TEMP_DIR, "seed_jlpt.sql")
    
    with open(sql_file, "w", encoding="utf-8") as f:
        # 테이블이 이미 존재하면 데이터만 삭제 (JPA가 테이블을 생성하므로)
        f.write("DELETE FROM jlpt_words;\n")
        f.write("ALTER TABLE jlpt_words AUTO_INCREMENT = 1;\n\n")
        
        # INSERT 문 생성
        batch_size = 100
        for i in range(0, len(words), batch_size):
            batch = words[i:i+batch_size]
            
            f.write("INSERT INTO jlpt_words (level, word, reading, meaning, day) VALUES\n")
            
            values = []
            for w in batch:
                # SQL 인젝션 방지를 위한 이스케이프
                word_esc = w["word"].replace("'", "''").replace("\\", "\\\\")
                reading_esc = w["reading"].replace("'", "''").replace("\\", "\\\\")
                meaning_esc = w["meaning"].replace("'", "''").replace("\\", "\\\\")
                day_esc = w["day"].replace("'", "''")
                
                values.append(f"  ('{w['level']}', '{word_esc}', '{reading_esc}', '{meaning_esc}', '{day_esc}')")
            
            f.write(",\n".join(values))
            f.write(";\n\n")
    
    print(f"   → SQL 파일 생성 완료: {sql_file}")
    
    # MySQL에 실행
    result = subprocess.run(
        [
            "mysql",
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
    
    print(f"   → MySQL에 {len(words)}개 단어 삽입 완료!")

def verify():
    """시드 데이터를 검증합니다."""
    print("[4/4] 시드 데이터 검증 중...")
    
    result = subprocess.run(
        [
            "mysql",
            f"-h{MYSQL_HOST}",
            f"-P{MYSQL_PORT}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASS}",
            MYSQL_DB,
            "-e",
            "SELECT level, COUNT(*) as count FROM jlpt_words GROUP BY level ORDER BY level;"
        ],
        capture_output=True,
        text=True
    )
    
    print(result.stdout)
    
    # 샘플 확인
    result2 = subprocess.run(
        [
            "mysql",
            f"-h{MYSQL_HOST}",
            f"-P{MYSQL_PORT}",
            f"-u{MYSQL_USER}",
            f"-p{MYSQL_PASS}",
            MYSQL_DB,
            "-e",
            "SELECT * FROM jlpt_words LIMIT 5;"
        ],
        capture_output=True,
        text=True
    )
    
    print("=== 샘플 데이터 ===")
    print(result2.stdout)
    print("✅ 시드 완료!")

if __name__ == "__main__":
    db_path = extract_anki_db()
    words = parse_words(db_path)
    seed_to_mysql(words)
    verify()
