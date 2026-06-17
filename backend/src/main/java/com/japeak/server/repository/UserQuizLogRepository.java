package com.japeak.server.repository;

import com.japeak.server.domain.UserQuizLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface UserQuizLogRepository extends JpaRepository<UserQuizLog, Long> {

}
