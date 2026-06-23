package com.japeak.server.controller;

import com.japeak.server.domain.JlptWord;
import com.japeak.server.repository.JlptWordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/vocabulary")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class VocabularyController {

    private final JlptWordRepository jlptWordRepository;

    // 레벨별 단어 목록 (페이징)
    @GetMapping
    public ResponseEntity<?> getVocabulary(
            @RequestParam String level,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<JlptWord> words = jlptWordRepository.findByLevel(level, PageRequest.of(page, size));
        return ResponseEntity.ok(words);
    }

    // 레벨별 Day 그룹 목록
    @GetMapping("/days")
    public ResponseEntity<?> getDays(@RequestParam String level) {
        List<String> days = jlptWordRepository.findDistinctDaysByLevel(level);
        List<Map<String, Object>> result = new ArrayList<>();

        for (String day : days) {
            List<JlptWord> words = jlptWordRepository.findByLevelAndDayOrderByIdAsc(level, day);
            Map<String, Object> group = new LinkedHashMap<>();
            group.put("day", day);
            group.put("words", words);
            result.add(group);
        }

        return ResponseEntity.ok(result);
    }

    // 단어 검색
    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String q) {
        if (q == null || q.trim().isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<JlptWord> results = jlptWordRepository.searchByQuery(q.trim());
        return ResponseEntity.ok(results);
    }

    // 레벨별 통계
    @GetMapping("/stats")
    public ResponseEntity<?> getStats() {
        Map<String, Long> stats = new LinkedHashMap<>();
        for (String level : List.of("N5", "N4", "N3", "N2", "N1")) {
            stats.put(level, jlptWordRepository.countByLevel(level));
        }
        return ResponseEntity.ok(stats);
    }
}
