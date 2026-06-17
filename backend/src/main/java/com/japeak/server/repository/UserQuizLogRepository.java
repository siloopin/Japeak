package com.japeak.server.repository;

import com.japeak.server.domain.UserQuizLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserQuizLogRepository extends JpaRepository<UserQuizLog, Long> {

    @Query("SELECT l FROM UserQuizLog l JOIN FETCH l.quiz WHERE l.user.id = :userId AND YEAR(l.answeredAt) = :year AND MONTH(l.answeredAt) = :month ORDER BY l.answeredAt DESC")
    List<UserQuizLog> findByUserIdAndYearAndMonth(@Param("userId") Long userId, @Param("year") int year, @Param("month") int month);

}
