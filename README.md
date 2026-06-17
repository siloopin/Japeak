# Japeak (자피크) - AI 기반 일본어 학습 앱 🗻

Japeak은 JLPT(일본어 능력 시험) 및 기초 일본어 학습자를 위한 **AI 하이브리드 맞춤형 퀴즈 어플리케이션**입니다. 기존의 고정된 단어장을 넘어, 생성형 AI(Gemini, Groq)를 활용해 무한한 예문과 퀴즈를 생성하고 사용자의 학습 수준에 맞춰 실시간으로 난이도를 조절합니다.

해당 레포지토리는 프론트엔드(React Native)와 백엔드(Spring Boot)를 통합 관리하는 **Monorepo**입니다.

---

## 🛠 Tech Stack

### Frontend (`/frontend`)
- **Framework**: React Native (Expo)
- **Language**: TypeScript

### Backend (`/backend`)
- **Framework**: Spring Boot (Java)
- **Database**: MySQL (Spring Data JPA)
- **AI & LLM**: Google Gemini API, Groq API (Llama 3)
- **Security**: JWT (JSON Web Token) 기반 인증

---

## 💡 핵심 아키텍처 (Hybrid AI Quiz System)

Japeak의 퀴즈 출제 로직은 API 토큰 낭비를 막고 사용자에게 끊김 없는 경험을 제공하기 위해 설계되었습니다.

1. **DB 기반 초고속 캐싱 출제 (80%)**
   - **오답 노트 복습 (30%)**: 유저가 과거에 틀렸던 문제를 DB에서 무작위로 가져와 복습을 유도합니다.
   - **새로운 단어 학습 (50%)**: 사전에 구축해둔 방대한 양의 퀴즈 데이터베이스에서 새로운 문제를 출제합니다. 토큰 소모가 0이며 응답 속도가 매우 빠릅니다.

2. **실시간 AI 맞춤형 출제 (20%)**
   - 사전에 없는 단어나 새로운 유형의 퀴즈가 필요할 때, AI가 실시간으로 퀴즈를 만들어 냅니다.
   - **역할 분담 (Method C)**: 
     - 50% 확률: 가볍고 빠른 **Groq**이 투입되어 단순 의미 맞추기 단어 퀴즈를 생성합니다.
     - 50% 확률: 강력한 **Gemini**가 투입되어 실제 일본어 예문, 해석, 그리고 문장에 쓰인 모든 한자의 부수(Radical) 해설까지 포함된 딥러닝 퀴즈를 생성합니다.
   - **전면 폴백 시스템 (Method A)**:
     - 제미나이가 일일 트래픽 한도(429/503 에러)에 도달해 서버가 터지는 것을 방지하기 위해 `try-catch` 폴백 로직을 구축했습니다.
     - 제미나이가 응답하지 않을 경우, 1초 만에 응답하는 **Groq 모델이 즉시 대타로 투입**되어 예문이 포함된 복잡한 퀴즈까지 모두 대신 생성해 냅니다. 유저는 서버 에러를 겪지 않습니다.

---

## 🚀 프로젝트 실행 방법 (Getting Started)

### 1. 백엔드 실행 (Backend)
MySQL 데이터베이스를 도커로 띄우고, AI API 키를 환경변수로 주입하여 스프링 부트 서버를 실행합니다.

```bash
cd backend
docker-compose up -d

# API 키 주입 후 실행 (macOS/Linux)
GEMINI_API_KEY="your_gemini_api_key" GROQ_API_KEY="your_groq_api_key" ./gradlew bootRun
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
