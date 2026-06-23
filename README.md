# Japeak (자피크) — AI 기반 일본어 학습 앱 🗻

<div align="center">

<img src="./assets/screenshot_splash.png" alt="스플래시" width="200"/>　<img src="./assets/screenshot_login.png" alt="로그인" width="200"/>　<img src="./assets/screenshot_home.png" alt="홈" width="200"/>

<img src="./assets/japeak_mockup_review.png" alt="복습 노트" width="400"/>

**JLPT N1~N5 대응 · AI 맞춤형 퀴즈 · 한자 사전 · 단어장 · 오답 노트**

</div>

---

## 📖 프로젝트 소개

**Japeak**은 JLPT(일본어 능력 시험) 및 기초 일본어 학습자를 위한 **AI 맞춤형 퀴즈 모바일 어플리케이션**입니다.

Groq의 초고속 LLM(Llama 3.3 70B)을 활용해 실시간으로 일본어 퀴즈·예문·해석을 생성하고, 사용자의 정답률과 연속 정답 수에 따라 **난이도를 자동 조절**합니다. 퀴즈를 풀면서 모르는 한자를 바로 터치하여 뜻을 확인하고 발음도 들을 수 있으며, 3,700여 개의 JLPT 필수 단어와 2,600여 개의 상용 한자 사전이 내장되어 있습니다.

이 레포지토리는 프론트엔드(React Native/Expo)와 백엔드(Spring Boot)를 통합 관리하는 **Monorepo**입니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|---|---|
| 🤖 **AI 맞춤형 퀴즈** | Groq LLM이 실시간으로 난이도별 단어/문장 퀴즈 생성, 예문·해석·한자 부수까지 포함 |
| 📊 **결과 화면** | 퀴즈 완료 후 원형 그래프 애니메이션과 함께 정답 수·오답 수·정확도 표시 |
| 📚 **JLPT 단어장** | N5~N1 레벨별 3,734개 단어를 Day별로 분류, 검색 기능 제공 |
| 🈶 **한자 터치 사전** | 퀴즈·단어장 내 한자를 터치하면 한국어 뜻 즉시 표시 (Anki 덱 기반 2,633자) |
| 🔊 **TTS 발음 듣기** | 단어·한자의 일본어 발음을 네이티브 TTS 엔진으로 즉시 재생 |
| 🧠 **AI 음독/훈독 조회** | 원할 때만 "AI로 자세히 알아보기" 버튼으로 음독·훈독·부수 조회 |
| 💡 **스마트 힌트** | 한자 문제는 히라가나 발음을 힌트로 제공, 히라가나 문제는 힌트 없음 |
| 📝 **오답 노트** | 틀린 문제를 자동 기록, 오답만 모아서 재시험 가능 |
| 🔁 **중복 방지** | 세션 내 출제된 단어를 서버에 전달하여 20문제 내 중복 없이 출제 |
| 🔐 **JWT 인증** | 회원가입·로그인·토큰 기반 보안 API |

---

## 🛠 기술 스택

### Frontend
- **React Native** (Expo SDK 51) — iOS/Android 크로스 플랫폼
- **TypeScript** — 타입 안전성
- **Zustand** — 전역 인증 상태 관리
- **expo-speech** — 일본어 TTS 발음
- **expo-blur / expo-linear-gradient** — 글래스모피즘 UI

### Backend
- **Spring Boot 4.1** (Java 17) — REST API 서버
- **Spring Data JPA + MySQL** — 데이터 퍼시스턴스
- **Spring WebFlux WebClient** — 비동기 Groq API 호출
- **JJWT 0.11.5** — JWT 토큰 발급·검증
- **Groq API** (Llama 3.3 70B) — 퀴즈·한자 정보 AI 생성
- **Lombok** — 보일러플레이트 코드 제거
- **Docker / MySQL 8** — 로컬 개발 DB

---

## 💡 퀴즈 출제 아키텍처 (4단계 폴백)

```
1. [30%] 오답 복습 퀴즈 (DB) ───────────────── 세션 중복 단어 제외
         ↓ 해당 없으면
2. [50%] DB 캐시 퀴즈 재활용 ────────────────── 세션 중복 단어 제외
         ↓ 해당 없으면
3. [70%] JLPT 단어 기반 즉시 퀴즈 (AI 없음) ── recentWords 제외 쿼리
         ↓ 해당 없으면
4.       Groq AI 실시간 생성 (최대 2회 재시도) → DB 자동 저장
```

- 생성된 퀴즈는 DB에 저장되어 이후 단계 2에서 재활용됩니다.
- 프론트엔드는 세션 전체 출제 단어를 `recentWords`로 백엔드에 전달합니다.

---

## 🚀 프로젝트 실행 방법

### 1. 백엔드 실행
```bash
cd backend
docker-compose up -d        # MySQL 8 컨테이너 시작

# Groq API 키 주입 후 실행
GROQ_API_KEY="gsk_xxxxx" ./gradlew bootRun
```

### 2. 프론트엔드 실행
```bash
cd frontend
npm install
npx expo start -c           # Expo Metro 번들러 시작
```

### 3. 한자 사전 DB 시드 (최초 1회)
```bash
cd backend
python3 seed-kanji.py       # 2,633자 상용 한자 MySQL 삽입
```

---

## 📂 폴더 구조

```
📦 Japeak/
 ┣ 📂 frontend/                     ← React Native (Expo) 앱
 ┃ ┣ 📂 src/
 ┃ ┃ ┣ 📂 screens/                  ← 화면 컴포넌트 (8개)
 ┃ ┃ ┣ 📂 components/               ← 재사용 컴포넌트 (KanjiWord, KanjiBottomSheet)
 ┃ ┃ ┣ 📂 store/                    ← Zustand 전역 상태
 ┃ ┃ ┗ 📂 utils/                    ← API 통신 함수
 ┃ ┗ 📜 App.tsx                     ← 앱 진입점 / 네비게이션 설정
 ┣ 📂 backend/                      ← Spring Boot 서버
 ┃ ┣ 📂 src/main/java/com/japeak/server/
 ┃ ┃ ┣ 📂 controller/               ← REST API 컨트롤러 (4개)
 ┃ ┃ ┣ 📂 service/                  ← Groq AI 서비스
 ┃ ┃ ┣ 📂 domain/                   ← JPA 엔티티 (5개)
 ┃ ┃ ┣ 📂 repository/               ← Spring Data JPA 레포지토리
 ┃ ┃ ┣ 📂 dto/                      ← 데이터 전송 객체
 ┃ ┃ └ 📂 util/                     ← JWT 유틸
 ┃ ┣ 📜 docker-compose.yml          ← MySQL 8 컨테이너 설정
 ┃ ┗ 📜 seed-kanji.py               ← 한자 사전 초기 데이터 스크립트
 ┗ 📂 assets/                       ← 앱 이미지·스크린샷
```

---

## 🗃 데이터베이스 스키마 (주요 테이블)

| 테이블 | 설명 |
|---|---|
| `users` | 회원 정보 (이메일, 비밀번호 해시) |
| `quizzes` | AI·JLPT 기반으로 생성된 퀴즈 캐시 |
| `user_quiz_logs` | 유저별 퀴즈 정답/오답 이력 |
| `jlpt_words` | JLPT N5~N1 단어 3,734개 |
| `kanji_dictionary` | 상용 한자 2,633자 (Anki 덱 추출) |

---

> 📄 상세 문서: [frontend/README.md](./frontend/README.md) · [backend/README.md](./backend/README.md)
