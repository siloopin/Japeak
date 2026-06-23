# Japeak — Backend (Spring Boot) 📡

<div align="center">
<img src="../assets/japeak_mockup_review.png" alt="복습 노트 목업" width="350"/>
</div>

<br/>

Spring Boot 기반의 REST API 서버입니다. Groq LLM을 활용한 퀴즈 생성, JWT 인증, JLPT 단어 관리, 한자 사전 조회 기능을 제공합니다.

---

## 🛠 기술 스택 상세

### ✅ Spring Boot 4.1 (Java 17)
- 프로젝트의 핵심 웹 프레임워크입니다.
- `@RestController`, `@GetMapping`, `@PostMapping` 등 어노테이션으로 RESTful API를 구성합니다.
- `@CrossOrigin(originPatterns = "*")`으로 모바일 앱(Expo)의 API 접근을 허용합니다.
- `application.yml`에서 환경변수(`${GROQ_API_KEY:}`)로 API 키를 주입하여 소스코드에 키를 노출하지 않습니다.

### ✅ Spring Data JPA + MySQL 8
- 모든 비즈니스 데이터는 JPA 엔티티로 관리됩니다.
- `@Entity`, `@Table`, `@Column` 어노테이션으로 MySQL 스키마를 자동 생성·동기화(`ddl-auto: update`)합니다.
- **커스텀 쿼리**: 복잡한 집계·랜덤 조회가 필요한 곳에는 `@Query(nativeQuery = true)`로 MySQL 네이티브 쿼리를 직접 작성합니다.
  ```java
  // 예시: 이번 세션에 나온 단어를 제외한 랜덤 JLPT 단어 조회
  @Query(value = "SELECT * FROM jlpt_words WHERE level = :level AND word NOT IN :excludeWords ORDER BY RAND() LIMIT 1", nativeQuery = true)
  JlptWord findRandomByLevelExcludingWords(@Param("level") String level, @Param("excludeWords") List<String> excludeWords);
  ```
- **Docker Compose**로 로컬 MySQL 8 컨테이너를 올려 개발 환경을 통일합니다.

### ✅ Spring WebFlux (WebClient)
- Groq AI API 호출 시 블로킹 없이 비동기 HTTP 요청을 보내기 위해 `WebClient`를 사용합니다.
- `RestTemplate` 대신 WebClient를 선택한 이유: AI 응답 대기 시간이 길기 때문에 스레드를 점유하지 않는 논블로킹 방식이 유리합니다.
- 최대 인메모리 크기를 10MB로 설정하여 대용량 AI 응답도 안정적으로 처리합니다.
  ```java
  this.webClient = WebClient.builder()
      .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
      .build();
  ```

### ✅ JJWT 0.11.5 (JWT 인증)
- 회원가입/로그인 성공 시 JWT 토큰을 발급하고, 이후 모든 API 요청의 `Authorization: Bearer <token>` 헤더를 검증합니다.
- `JwtUtil` 클래스가 토큰 발급(`generateToken`)·파싱(`parseToken`)을 담당합니다.
- 토큰 payload에 `userId`를 포함하여, 컨트롤러에서 현재 로그인한 유저를 DB에서 즉시 조회할 수 있습니다.
  ```java
  Claims claims = jwtUtil.parseToken(token);
  Long userId = claims.get("userId", Long.class);
  ```

### ✅ Groq API (Llama 3.3 70B)
- **퀴즈 생성** (`GroqService.generateQuiz`): 난이도, 이전 정답 여부, 연속 정답 수, 최근 출제 단어 목록을 프롬프트에 담아 AI에게 전달합니다.
- **한자 상세 조회** (`GroqService.getKanjiDetails`): 특정 한자의 음독·훈독·부수를 JSON으로 반환하도록 프롬프트를 설계합니다.
- `response_format: { type: "json_object" }` 파라미터로 AI가 항상 유효한 JSON만 반환하도록 강제합니다.
- 생성된 응답에서 마크다운 코드블록(` ```json `)이 포함될 경우 자동으로 제거합니다.

### ✅ Lombok
- `@Getter`, `@Setter`, `@NoArgsConstructor`, `@RequiredArgsConstructor` 어노테이션으로 JPA 엔티티와 서비스 클래스의 보일러플레이트 코드를 제거합니다.
- 특히 `@RequiredArgsConstructor`는 `final` 필드에 대한 생성자를 자동 생성하여 **생성자 주입 방식의 의존성 주입(DI)**을 깔끔하게 처리합니다.

---

## 📂 디렉토리 구조

```
backend/
 ┣ src/main/java/com/japeak/server/
 ┃ ┣ controller/
 ┃ ┃ ┣ AuthController.java         ← 회원가입·로그인·JWT 발급
 ┃ ┃ ┣ QuizController.java         ← 퀴즈 출제 (4단계 폴백) / 정답 제출 / 오답 조회
 ┃ ┃ ┣ VocabularyController.java   ← JLPT 단어장 조회·검색 API
 ┃ ┃ ┗ KanjiController.java        ← 한자 DB 조회 / AI 음독·훈독·부수 조회
 ┃ ┣ service/
 ┃ ┃ ┗ GroqService.java            ← WebClient 기반 Groq API 호출 로직
 ┃ ┣ domain/
 ┃ ┃ ┣ User.java                   ← 회원 엔티티
 ┃ ┃ ┣ Quiz.java                   ← AI/JLPT 퀴즈 캐시 엔티티
 ┃ ┃ ┣ UserQuizLog.java            ← 유저별 퀴즈 이력 엔티티
 ┃ ┃ ┣ JlptWord.java               ← JLPT N5~N1 단어 엔티티
 ┃ ┃ ┗ KanjiDictionary.java        ← 상용 한자 사전 엔티티
 ┃ ┣ repository/
 ┃ ┃ ┣ QuizRepository.java         ← 오답·랜덤 퀴즈 커스텀 쿼리
 ┃ ┃ ┣ JlptWordRepository.java     ← 레벨별·Day별·검색·중복제외 쿼리
 ┃ ┃ ┣ KanjiDictionaryRepository.java
 ┃ ┃ ┣ UserRepository.java
 ┃ ┃ ┗ UserQuizLogRepository.java
 ┃ ┣ dto/
 ┃ ┃ ┗ QuizDto.java                ← 퀴즈 API 응답 DTO
 ┃ ┗ util/
 ┃   ┗ JwtUtil.java                ← JWT 토큰 발급·파싱 유틸
 ┣ src/main/resources/
 ┃ ┗ application.yml               ← DB·Groq 환경변수 설정
 ┣ docker-compose.yml              ← MySQL 8 컨테이너 정의
 ┗ seed-kanji.py                   ← Anki 덱에서 한자 데이터 추출·MySQL 삽입 스크립트
```

---

## 🔌 API 엔드포인트

### 인증 (`/api/auth`)
| Method | 경로 | 설명 |
|---|---|---|
| `POST` | `/api/auth/register` | 회원가입 (이메일, 비밀번호) |
| `POST` | `/api/auth/login` | 로그인 → JWT 토큰 반환 |

### 퀴즈 (`/api/quiz`)
| Method | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/quiz/next` | 다음 퀴즈 출제 (4단계 폴백 로직) |
| `POST` | `/api/quiz/{id}/answer` | 정답 제출 및 오답 기록 |
| `GET` | `/api/quiz/incorrect` | 오답 노트 조회 |
| `GET` | `/api/quiz/today` | 오늘의 퀴즈 이력 조회 |

**`GET /api/quiz/next` 쿼리 파라미터:**
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `difficulty` | string | 현재 난이도 (`Beginner`, `N5`~`N1`) |
| `wasCorrect` | boolean | 이전 문제 정답 여부 |
| `consecutiveCorrect` | int | 연속 정답 수 |
| `recentWords` | string | 이번 세션 출제 단어 목록 (쉼표 구분) |

### 단어장 (`/api/vocabulary`)
| Method | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/vocabulary` | 레벨별 단어 목록 (페이징) |
| `GET` | `/api/vocabulary/days` | 레벨별 Day 그룹 조회 |
| `GET` | `/api/vocabulary/search` | 단어·독음·뜻 통합 검색 |

### 한자 (`/api/kanji`)
| Method | 경로 | 설명 |
|---|---|---|
| `GET` | `/api/kanji/{character}` | 한자 한국어 뜻 조회 (DB) |
| `GET` | `/api/kanji/ai/{character}` | 음독·훈독·부수 AI 조회 (Groq) |

---

## 🗃 데이터베이스 스키마

### quizzes
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BIGINT PK | 자동 증가 |
| `difficulty` | VARCHAR | 난이도 (N5~N1, Beginner) |
| `type` | VARCHAR | 퀴즈 유형 (word / sentence) |
| `question` | TEXT | 문제 텍스트 |
| `answer` | VARCHAR | 정답 |
| `options_json` | TEXT | 보기 목록 (JSON 배열) |
| `word` | VARCHAR | 핵심 단어 |
| `reading` | VARCHAR | 히라가나 독음 |
| `meaning` | VARCHAR | 한국어 뜻 |
| `example_sentence` | TEXT | 예문 |
| `example_meaning` | TEXT | 예문 해석 |
| `kanji_words_json` | TEXT | 등장 한자 목록 (JSON) |

### jlpt_words
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | BIGINT PK | 자동 증가 |
| `level` | VARCHAR | JLPT 레벨 (N5~N1) |
| `word` | VARCHAR | 단어 (한자 표기) |
| `reading` | VARCHAR | 히라가나 독음 |
| `meaning` | VARCHAR | 한국어 뜻 |
| `day` | VARCHAR | 학습 Day (Day01~) |

### kanji_dictionary
| 컬럼 | 타입 | 설명 |
|---|---|---|
| `kanji` | VARCHAR(50) PK | 한자 |
| `meaning` | VARCHAR(255) | 한국어 뜻 |

---

## ⚙️ 환경변수 설정 (`application.yml`)

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/japeak
    username: root
    password: rootpassword

groq:
  api:
    key: ${GROQ_API_KEY:}
    url: https://api.groq.com/openai/v1/chat/completions

jwt:
  secret: ${JWT_SECRET:default-secret-key}
```

> `${VAR:}` 문법으로 환경변수가 없어도 빌드 오류가 발생하지 않습니다.

---

## 🚀 실행 방법

```bash
# 1. MySQL 컨테이너 시작
docker-compose up -d

# 2. (최초 1회) 한자 사전 데이터 삽입
python3 seed-kanji.py

# 3. 백엔드 서버 실행
GROQ_API_KEY="gsk_xxxxx" ./gradlew bootRun
```

서버 기본 포트: **`http://localhost:8080`**
