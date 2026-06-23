package com.japeak.server.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.japeak.server.domain.JlptWord;
import com.japeak.server.domain.Quiz;
import com.japeak.server.domain.User;
import com.japeak.server.domain.UserQuizLog;
import com.japeak.server.dto.QuizDto;
import com.japeak.server.dto.HistoryLogDto;
import com.japeak.server.repository.JlptWordRepository;
import com.japeak.server.repository.QuizRepository;
import com.japeak.server.repository.UserQuizLogRepository;
import com.japeak.server.repository.UserRepository;
import com.japeak.server.service.GeminiService;
import com.japeak.server.service.GroqService;
import com.japeak.server.util.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/quiz")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class QuizController {

    private final GeminiService geminiService;
    private final GroqService groqService;
    private final JlptWordRepository jlptWordRepository;
    private final QuizRepository quizRepository;
    private final UserQuizLogRepository userQuizLogRepository;
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private User getAuthenticatedUser(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new RuntimeException("Unauthorized");
        }
        String token = authHeader.substring(7);
        Claims claims = jwtUtil.parseToken(token);
        Long userId = claims.get("userId", Long.class);
        return userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
    }

    @GetMapping("/next")
    public ResponseEntity<QuizDto> getNextQuiz(@RequestHeader("Authorization") String authHeader,
                                               @RequestParam(required = false, defaultValue = "N5") String difficulty,
                                               @RequestParam(required = false) Boolean wasCorrect,
                                               @RequestParam(required = false, defaultValue = "0") int consecutiveCorrect,
                                               @RequestParam(required = false, defaultValue = "") String recentWords) {
        
        User user = getAuthenticatedUser(authHeader);

        // recentWords 파싱 (쉼표로 구분된 단어 목록)
        List<String> recentWordList = new ArrayList<>();
        if (recentWords != null && !recentWords.trim().isEmpty()) {
            String cleaned = recentWords.replaceAll("^\\[|\\]$", "").trim();
            for (String w : cleaned.split(",")) {
                String trimmed = w.trim();
                if (!trimmed.isEmpty()) recentWordList.add(trimmed);
            }
        }

        // 1. 30% 확률로 오답 복습 문제 출제 (DB에서 가져옴, AI 사용 안 함)
        if (Math.random() < 0.3) {
            Optional<Quiz> incorrectQuizOpt = quizRepository.findRandomIncorrectQuizForUser(user.getId());
            // 이미 이번 세션에서 낸 단어는 건너뜀
            if (incorrectQuizOpt.isPresent() && !recentWordList.contains(incorrectQuizOpt.get().getWord())) {
                System.out.println("[Quiz] 오답 복습 문제 출제 (DB)");
                return ResponseEntity.ok(convertToDto(incorrectQuizOpt.get(), difficulty));
            }
        }

        // 2. DB에 이미 저장된 정상 퀴즈가 있으면 50% 확률로 재활용 (이번 세션 단어 제외)
        if (Math.random() < 0.5) {
            Optional<Quiz> randomQuizOpt = quizRepository.findRandomQuizForUser(difficulty, user.getId());
            if (randomQuizOpt.isPresent() && !recentWordList.contains(randomQuizOpt.get().getWord())) {
                System.out.println("[Quiz] DB 저장 문제 재활용");
                return ResponseEntity.ok(convertToDto(randomQuizOpt.get(), difficulty));
            }
        }

        // 3. JLPT 단어 기반 즉시 퀴즈 생성 (AI 없이, 중복 방지 적용)
        if (Math.random() < 0.7) {
            try {
                String jlptLevel = difficulty;
                if ("Beginner".equals(difficulty)) jlptLevel = "N5";

                // recentWords에 없는 단어로 뽑기
                JlptWord targetWord = null;
                if (!recentWordList.isEmpty()) {
                    targetWord = jlptWordRepository.findRandomByLevelExcludingWords(jlptLevel, recentWordList);
                }
                // 제외 단어 목록이 없거나 fallback
                if (targetWord == null) {
                    targetWord = jlptWordRepository.findRandomByLevel(jlptLevel);
                }
                if (targetWord != null) {
                    List<JlptWord> wrongOptions = jlptWordRepository.findRandomByLevelExcluding(jlptLevel, targetWord.getId());
                    if (wrongOptions.size() >= 3) {
                        System.out.println("[Quiz] JLPT 단어 기반 즉시 퀴즈: " + targetWord.getWord());
                        
                        // 선지 구성 (정답 + 오답 3개의 한국어 뜻)
                        List<String> options = new ArrayList<>();
                        options.add(targetWord.getMeaning());
                        for (JlptWord w : wrongOptions) {
                            options.add(w.getMeaning());
                        }
                        Collections.shuffle(options);

                        // QuizDto 구성
                        QuizDto dto = new QuizDto();
                        dto.setType("word");
                        dto.setQuestion(targetWord.getWord());
                        dto.setQuestion_meaning(targetWord.getMeaning());
                        dto.setOptions(options);
                        dto.setAnswer(targetWord.getMeaning());
                        dto.setWord(targetWord.getWord());
                        dto.setReading(targetWord.getReading());
                        dto.setMeaning(targetWord.getMeaning());
                        dto.setNew_difficulty(difficulty);
                        dto.setKanji_words(new ArrayList<>());

                        // DB에도 저장 (오답 노트 등에 활용)
                        Quiz quiz = new Quiz();
                        quiz.setDifficulty(difficulty);
                        quiz.setType("word");
                        quiz.setQuestion(targetWord.getWord());
                        quiz.setQuestionMeaning(targetWord.getMeaning());
                        quiz.setAnswer(targetWord.getMeaning());
                        quiz.setOptionsJson(objectMapper.writeValueAsString(options));
                        quiz.setWord(targetWord.getWord());
                        quiz.setReading(targetWord.getReading());
                        quiz.setMeaning(targetWord.getMeaning());
                        quiz.setKanjiWordsJson("[]");
                        quizRepository.save(quiz);
                        dto.setId(quiz.getId());

                        return ResponseEntity.ok(dto);
                    }
                }
            } catch (Exception e) {
                System.err.println("[Quiz] JLPT 단어 기반 퀴즈 생성 실패: " + e.getMessage());
            }
        }

        // 4. Groq AI로 새로운 퀴즈 생성 (최대 2회 재시도)
        boolean isSimple = Math.random() < 0.5; // 50% 단어형, 50% 복합형
        
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                System.out.println("[Quiz] Groq AI 퀴즈 생성 시도 " + attempt + "회차 (isSimple=" + isSimple + ")");
                String quizJsonString = groqService.generateQuiz(difficulty, wasCorrect, consecutiveCorrect, isSimple, recentWords);

                // 마크다운 코드블록 제거
                if (quizJsonString != null) {
                    quizJsonString = quizJsonString.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
                }

                QuizDto dto = objectMapper.readValue(quizJsonString, QuizDto.class);

                // 유효성 검증: question, answer, options가 정상인지 확인
                if (dto.getQuestion() == null || dto.getQuestion().trim().isEmpty()) {
                    throw new RuntimeException("question이 비어 있음");
                }
                if (dto.getAnswer() == null || dto.getAnswer().trim().isEmpty()) {
                    throw new RuntimeException("answer가 비어 있음");
                }
                if (dto.getOptions() == null || dto.getOptions().size() != 4) {
                    throw new RuntimeException("options가 4개가 아님");
                }
                // 선지가 전부 한자만으로 이루어져 있으면 비정상 (한국어 또는 히라가나가 포함되어야 함)
                if (dto.getType() != null && dto.getType().equals("word")) {
                    boolean allOptionsLookBroken = dto.getOptions().stream().allMatch(opt -> 
                        opt != null && opt.matches("^[\\u4E00-\\u9FFF]+$") // 순수 한자만으로 구성
                    );
                    if (allOptionsLookBroken) {
                        throw new RuntimeException("선지가 전부 한자만으로 구성됨 (한국어 선지가 아님): " + dto.getOptions());
                    }
                }

                System.out.println("[Quiz] Groq AI 퀴즈 생성 성공! question=" + dto.getQuestion() + ", answer=" + dto.getAnswer());

                // DB에 저장
                Quiz quiz = new Quiz();
                quiz.setDifficulty(difficulty);
                quiz.setType(dto.getType());
                quiz.setQuestion(dto.getQuestion());
                quiz.setQuestionMeaning(dto.getQuestion_meaning());
                quiz.setAnswer(dto.getAnswer());
                quiz.setOptionsJson(objectMapper.writeValueAsString(dto.getOptions()));
                quiz.setWord(dto.getWord());
                quiz.setReading(dto.getReading());
                quiz.setMeaning(dto.getMeaning());
                quiz.setExampleSentence(dto.getExample_sentence());
                quiz.setExampleMeaning(dto.getExample_meaning());
                quiz.setKanjiWordsJson(objectMapper.writeValueAsString(dto.getKanji_words()));

                quizRepository.save(quiz);
                dto.setId(quiz.getId());

                return ResponseEntity.ok(dto);

            } catch (Exception e) {
                System.err.println("[Quiz] Groq AI 퀴즈 생성 실패 (시도 " + attempt + "): " + e.getMessage());
                if (attempt == 2) {
                    // 2회 모두 실패 시 DB 폴백
                    System.out.println("[Quiz] 2회 연속 실패, DB 폴백 시도");
                    Optional<Quiz> fallbackQuiz = quizRepository.findRandomQuizForUser(difficulty, user.getId());
                    if (fallbackQuiz.isPresent()) {
                        return ResponseEntity.ok(convertToDto(fallbackQuiz.get(), difficulty));
                    } else {
                        System.out.println("[Quiz] DB에 폴백 퀴즈 없음, 최후의 수단으로 JLPT 즉석 퀴즈 출제");
                        String jlptLevel = "Beginner".equals(difficulty) ? "N5" : difficulty;
                        JlptWord targetWord = jlptWordRepository.findRandomByLevel(jlptLevel);
                        if (targetWord != null) {
                            List<JlptWord> wrongOptions = jlptWordRepository.findRandomByLevelExcluding(jlptLevel, targetWord.getId());
                            if (wrongOptions.size() >= 3) {
                                List<String> options = new ArrayList<>();
                                options.add(targetWord.getMeaning());
                                for (JlptWord w : wrongOptions) {
                                    options.add(w.getMeaning());
                                }
                                Collections.shuffle(options);
                                QuizDto dto = new QuizDto();
                                dto.setType("word");
                                dto.setQuestion(targetWord.getWord());
                                dto.setQuestion_meaning(targetWord.getMeaning());
                                dto.setOptions(options);
                                dto.setAnswer(targetWord.getMeaning());
                                dto.setWord(targetWord.getWord());
                                dto.setReading(targetWord.getReading());
                                dto.setMeaning(targetWord.getMeaning());
                                dto.setNew_difficulty(difficulty);
                                dto.setKanji_words(new ArrayList<>());
                                return ResponseEntity.ok(dto);
                            }
                        }
                        throw new RuntimeException("AI 퀴즈 생성 실패 및 DB에 폴백 퀴즈 없음", e);
                    }
                }
            }
        }

        throw new RuntimeException("Unexpected: quiz generation loop exited without returning");
    }

    @PostMapping("/answer")
    public ResponseEntity<?> submitAnswer(@RequestHeader("Authorization") String authHeader, @RequestBody AnswerRequest request) {
        User user = getAuthenticatedUser(authHeader);
        Quiz quiz = quizRepository.findById(request.getQuizId()).orElseThrow(() -> new RuntimeException("Quiz not found"));

        UserQuizLog log = new UserQuizLog();
        log.setUser(user);
        log.setQuiz(quiz);
        log.setIsCorrect(request.getIsCorrect());
        userQuizLogRepository.save(log);

        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/review/incorrect")
    public ResponseEntity<List<QuizDto>> getIncorrectReviewQuizzes(@RequestHeader("Authorization") String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        List<Quiz> quizzes = quizRepository.findIncorrectQuizzesForUser(user.getId());
        List<QuizDto> dtos = quizzes.stream().map(q -> convertToDto(q, q.getDifficulty())).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/review/today")
    public ResponseEntity<List<QuizDto>> getTodayReviewQuizzes(@RequestHeader("Authorization") String authHeader) {
        User user = getAuthenticatedUser(authHeader);
        LocalDateTime startOfDay = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        LocalDateTime endOfDay = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        List<Quiz> quizzes = quizRepository.findTodayQuizzesForUser(user.getId(), startOfDay, endOfDay);
        List<QuizDto> dtos = quizzes.stream().map(q -> convertToDto(q, q.getDifficulty())).collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/history")
    public ResponseEntity<?> getHistory(@RequestHeader("Authorization") String token,
                                        @RequestParam("year") int year,
                                        @RequestParam("month") int month) {
        String email = jwtUtil.parseToken(token.replace("Bearer ", "")).getSubject();
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("error", "User not found"));
        }
        User user = userOpt.get();
        List<UserQuizLog> logs = userQuizLogRepository.findByUserIdAndYearAndMonth(user.getId(), year, month);

        List<HistoryLogDto> history = logs.stream().map(log -> {
            HistoryLogDto dto = new HistoryLogDto();
            dto.setLogId(log.getId());
            dto.setQuizId(log.getQuiz().getId());
            dto.setType(log.getQuiz().getType());
            dto.setQuestion(log.getQuiz().getQuestion());
            dto.setQuestionMeaning(log.getQuiz().getQuestionMeaning());
            dto.setAnswer(log.getQuiz().getAnswer());
            dto.setWord(log.getQuiz().getWord());
            dto.setReading(log.getQuiz().getReading());
            dto.setMeaning(log.getQuiz().getMeaning());
            dto.setExampleSentence(log.getQuiz().getExampleSentence());
            dto.setExampleMeaning(log.getQuiz().getExampleMeaning());
            dto.setIsCorrect(log.getIsCorrect());
            dto.setAnsweredAt(log.getAnsweredAt());
            dto.setDayStudied(java.time.temporal.ChronoUnit.DAYS.between(user.getCreatedAt().toLocalDate(), log.getAnsweredAt().toLocalDate()) + 1);
            return dto;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(history);
    }

    private QuizDto convertToDto(Quiz quiz, String currentDifficulty) {
        QuizDto dto = new QuizDto();
        dto.setId(quiz.getId());
        dto.setType(quiz.getType());
        dto.setQuestion(quiz.getQuestion());
        dto.setQuestion_meaning(quiz.getQuestionMeaning());
        dto.setAnswer(quiz.getAnswer());
        dto.setWord(quiz.getWord());
        dto.setReading(quiz.getReading());
        dto.setMeaning(quiz.getMeaning());
        dto.setExample_sentence(quiz.getExampleSentence());
        dto.setExample_meaning(quiz.getExampleMeaning());
        dto.setNew_difficulty(currentDifficulty); // Keep same for cached

        try {
            List<String> options = objectMapper.readValue(quiz.getOptionsJson(), new TypeReference<List<String>>() {});
            dto.setOptions(options);
            
            if (quiz.getKanjiWordsJson() != null && !quiz.getKanjiWordsJson().isEmpty()) {
                List<Map<String, String>> kanjiWords = objectMapper.readValue(quiz.getKanjiWordsJson(), new TypeReference<List<Map<String, String>>>() {});
                dto.setKanji_words(kanjiWords);
            }
        } catch (JsonProcessingException e) {
            e.printStackTrace();
        }
        return dto;
    }

    @Data
    static class AnswerRequest {
        private Long quizId;
        private Boolean isCorrect;
    }
}
