package com.japeak.server.repository;

import com.japeak.server.domain.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface QuizRepository extends JpaRepository<Quiz, Long> {

    @Query(value = "SELECT * FROM quizzes q WHERE q.difficulty = :difficulty AND q.id NOT IN (SELECT l.quiz_id FROM user_quiz_logs l WHERE l.user_id = :userId) ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Optional<Quiz> findRandomQuizForUser(@Param("difficulty") String difficulty, @Param("userId") Long userId);

    @Query(value = "SELECT q.* FROM quizzes q JOIN user_quiz_logs l ON q.id = l.quiz_id WHERE l.user_id = :userId AND l.is_correct = false AND NOT EXISTS (SELECT 1 FROM user_quiz_logs l2 WHERE l2.user_id = :userId AND l2.quiz_id = q.id AND l2.is_correct = true) ORDER BY RAND() LIMIT 1", nativeQuery = true)
    Optional<Quiz> findRandomIncorrectQuizForUser(@Param("userId") Long userId);

    @Query(value = "SELECT q.* FROM quizzes q JOIN user_quiz_logs l ON q.id = l.quiz_id WHERE l.user_id = :userId AND l.is_correct = false AND NOT EXISTS (SELECT 1 FROM user_quiz_logs l2 WHERE l2.user_id = :userId AND l2.quiz_id = q.id AND l2.is_correct = true) GROUP BY q.id LIMIT 20", nativeQuery = true)
    java.util.List<Quiz> findIncorrectQuizzesForUser(@Param("userId") Long userId);

    @Query(value = "SELECT q.* FROM quizzes q JOIN user_quiz_logs l ON q.id = l.quiz_id WHERE l.user_id = :userId AND l.answered_at >= :startOfDay AND l.answered_at <= :endOfDay GROUP BY q.id LIMIT 20", nativeQuery = true)
    java.util.List<Quiz> findTodayQuizzesForUser(@Param("userId") Long userId, @Param("startOfDay") java.time.LocalDateTime startOfDay, @Param("endOfDay") java.time.LocalDateTime endOfDay);
}
