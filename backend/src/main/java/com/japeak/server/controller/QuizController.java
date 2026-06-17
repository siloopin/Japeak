package com.japeak.server.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.japeak.server.domain.Quiz;
import com.japeak.server.domain.User;
import com.japeak.server.domain.UserQuizLog;
import com.japeak.server.dto.QuizDto;
import com.japeak.server.dto.HistoryLogDto;
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
    public ResponseEntity<QuizDto> getNextQuiz(
            @RequestHeader("Authorization") String authHeader,
            @RequestParam(defaultValue = "N5") String difficulty,
            @RequestParam(required = false) Boolean wasCorrect,
            @RequestParam(defaultValue = "0") int consecutiveCorrect) {
        
        User user = getAuthenticatedUser(authHeader);

        // 1. 30% chance to fetch an incorrect quiz for review
        if (Math.random() < 0.3) {
            Optional<Quiz> incorrectQuizOpt = quizRepository.findRandomIncorrectQuizForUser(user.getId());
            if (incorrectQuizOpt.isPresent()) {
                return ResponseEntity.ok(convertToDto(incorrectQuizOpt.get(), difficulty));
            }
        }

        // 2. 50% chance to fetch a random new quiz from DB (never answered by this user)
        if (Math.random() < 0.5) {
            Optional<Quiz> randomQuizOpt = quizRepository.findRandomQuizForUser(difficulty, user.getId());
            if (randomQuizOpt.isPresent()) {
                return ResponseEntity.ok(convertToDto(randomQuizOpt.get(), difficulty));
            }
        }

        // 3. Hybrid Generation (Method C & Method A)
        String quizJsonString;
        boolean isSimple = Math.random() < 0.5; // 50% chance for simple word quiz

        if (isSimple) {
            // Method C: Simple tasks to Groq
            try {
                quizJsonString = groqService.generateQuiz(difficulty, wasCorrect, consecutiveCorrect, true);
            } catch (Exception e) {
                // If Groq fails, fallback to Gemini
                quizJsonString = geminiService.generateQuiz(difficulty, wasCorrect, consecutiveCorrect);
            }
        } else {
            // Method C: Complex tasks to Gemini
            try {
                quizJsonString = geminiService.generateQuiz(difficulty, wasCorrect, consecutiveCorrect);
            } catch (Exception e) {
                System.out.println("Gemini failed, falling back to Groq: " + e.getMessage());
                // Method A: Fallback to Groq for complex tasks
                quizJsonString = groqService.generateQuiz(difficulty, wasCorrect, consecutiveCorrect, false);
            }
        }
        
        // Clean up possible Markdown formatting from AI
        if (quizJsonString != null) {
            quizJsonString = quizJsonString.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
        }

        try {
            QuizDto dto = objectMapper.readValue(quizJsonString, QuizDto.class);
            
            // Save to DB
            Quiz quiz = new Quiz();
            quiz.setDifficulty(difficulty);
            quiz.setType(dto.getType());
            quiz.setQuestion(dto.getQuestion());
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
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            throw new RuntimeException("Failed to process Gemini JSON", e);
        }
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
