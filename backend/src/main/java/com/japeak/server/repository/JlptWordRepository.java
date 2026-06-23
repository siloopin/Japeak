package com.japeak.server.repository;

import com.japeak.server.domain.JlptWord;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface JlptWordRepository extends JpaRepository<JlptWord, Long> {

    // 레벨별 단어 목록 (페이징)
    Page<JlptWord> findByLevel(String level, Pageable pageable);

    // 레벨별 전체 단어 목록
    List<JlptWord> findByLevelOrderByDayAscIdAsc(String level);

    // 레벨 + Day별 단어 목록
    List<JlptWord> findByLevelAndDayOrderByIdAsc(String level, String day);

    // 레벨별 Day 목록
    @Query("SELECT DISTINCT j.day FROM JlptWord j WHERE j.level = :level ORDER BY j.day")
    List<String> findDistinctDaysByLevel(@Param("level") String level);

    // 퀴즈용: 해당 레벨에서 랜덤 단어 1개
    @Query(value = "SELECT * FROM jlpt_words WHERE level = :level ORDER BY RAND() LIMIT 1", nativeQuery = true)
    JlptWord findRandomByLevel(@Param("level") String level);

    // 퀴즈용: 이미 낸 단어 목록 제외하고 랜덤 단어 1개 (중복 방지)
    @Query(value = "SELECT * FROM jlpt_words WHERE level = :level AND word NOT IN :excludeWords ORDER BY RAND() LIMIT 1", nativeQuery = true)
    JlptWord findRandomByLevelExcludingWords(@Param("level") String level, @Param("excludeWords") List<String> excludeWords);

    // 퀴즈용: 해당 레벨에서 특정 단어 제외한 랜덤 단어 3개 (오답 선지용)
    @Query(value = "SELECT * FROM jlpt_words WHERE level = :level AND id != :excludeId ORDER BY RAND() LIMIT 3", nativeQuery = true)
    List<JlptWord> findRandomByLevelExcluding(@Param("level") String level, @Param("excludeId") Long excludeId);

    // 검색 (한국어 뜻, 일본어 단어, 읽기로 검색)
    @Query("SELECT j FROM JlptWord j WHERE j.word LIKE %:query% OR j.reading LIKE %:query% OR j.meaning LIKE %:query%")
    List<JlptWord> searchByQuery(@Param("query") String query);

    // 레벨별 단어 수
    long countByLevel(String level);
}
