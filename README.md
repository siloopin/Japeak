# Japeak (자피크) - AI 기반 일본어 학습 앱 🗻

<div align="center">
  <img src="./assets/screenshot_splash.png" alt="Japeak Splash" width="250" />
  <img src="./assets/screenshot_login.png" alt="Japeak Login" width="250" />
  <img src="./assets/screenshot_home.png" alt="Japeak Home" width="250" />
</div>

<br/>

Japeak은 JLPT(일본어 능력 시험) 및 기초 일본어 학습자를 위한 **AI 맞춤형 퀴즈 어플리케이션**입니다. 생성형 AI(Groq LLM)를 활용해 무한한 예문과 퀴즈를 실시간으로 생성하고, 사용자의 학습 수준에 맞춰 난이도를 자동 조절합니다.

해당 레포지토리는 프론트엔드(React Native)와 백엔드(Spring Boot)를 통합 관리하는 **Monorepo**입니다.

---

## 🛠 Tech Stack

### Frontend (`/frontend`)
- **Framework**: React Native (Expo)
- **Language**: TypeScript

### Backend (`/backend`)
- **Framework**: Spring Boot (Java)
- **Database**: MySQL (Spring Data JPA)
- **AI & LLM**: Groq API (Llama 3.3 70B)
- **Security**: JWT (JSON Web Token) 기반 인증

---

## 💡 핵심 아키텍처 (AI Quiz System)

Japeak의 퀴즈 출제 로직은 API 토큰 낭비를 막고 사용자에게 끊김 없는 경험을 제공하기 위해 설계되었습니다.

### 1. DB 기반 초고속 캐싱 출제
   - **오답 노트 복습 (30%)**: 유저가 과거에 틀렸던 문제를 DB에서 무작위로 가져와 복습을 유도합니다.
   - **새로운 단어 학습 (50%)**: AI가 과거에 생성해 DB에 저장해둔 퀴즈 데이터에서 새로운 문제를 출제합니다.

### 2. 실시간 AI 맞춤형 출제
   - DB에 적합한 퀴즈가 없을 때, **Groq AI**가 실시간으로 퀴즈를 생성합니다.
   - 일본어 예문, 한국어 해석, 한자의 히라가나 발음, 부수(Radical) 해설까지 포함된 딥러닝 퀴즈를 생성합니다.
   - **유효성 검증**: AI가 생성한 퀴즈의 내용이 비정상적이면 자동으로 재시도(최대 2회)합니다.
   - 생성된 퀴즈는 **DB에 자동 저장**되어 다음에 재활용됩니다.

### 3. 오답 노트 & 복습 시스템
   - 틀린 문제는 DB에 자동 기록되어 오답 노트에 추가됩니다.
   - 오답 복습 시에는 AI를 사용하지 않고 **DB에 저장된 데이터만으로** 문제를 출제합니다.

---

## 🚀 프로젝트 실행 방법 (Getting Started)

### 1. 백엔드 실행 (Backend)
MySQL 데이터베이스를 도커로 띄우고, AI API 키를 환경변수로 주입하여 스프링 부트 서버를 실행합니다.

```bash
cd backend
docker-compose up -d

# API 키 주입 후 실행 (macOS/Linux)
GROQ_API_KEY="your_groq_api_key" ./gradlew bootRun
```

### 2. 프론트엔드 실행 (Frontend)
```bash
cd frontend
npm install
npx expo start -c
```

---

## 📂 폴더 구조 (Directory Structure)
```text
📦 Japeak
 ┣ 📂 frontend (Expo 앱)
 ┃ ┣ 📂 src/screens (화면 컴포넌트)
 ┃ ┣ 📂 src/utils (API 통신 등 유틸)
 ┃ ┗ 📜 App.tsx (앱 진입점)
 ┗ 📂 backend (Spring Boot 서버)
   ┣ 📂 src/main/java/com/japeak/server/controller (REST API)
   ┣ 📂 src/main/java/com/japeak/server/service (AI 통신 로직)
   ┣ 📂 src/main/java/com/japeak/server/domain (DB 엔티티)
   ┗ 📜 docker-compose.yml (MySQL DB 설정)
```
