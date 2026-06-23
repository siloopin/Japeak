package com.japeak.server.controller;

import com.japeak.server.domain.KanjiDictionary;
import com.japeak.server.repository.KanjiDictionaryRepository;
import com.japeak.server.service.GroqService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/kanji")
@CrossOrigin(originPatterns = "*")
@RequiredArgsConstructor
public class KanjiController {

    private final KanjiDictionaryRepository kanjiDictionaryRepository;
    private final GroqService groqService;

    @GetMapping("/{character}")
    public ResponseEntity<?> getKanji(@PathVariable String character) {
        Optional<KanjiDictionary> kanji = kanjiDictionaryRepository.findById(character);
        if (kanji.isPresent()) {
            return ResponseEntity.ok(kanji.get());
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/ai/{character}")
    public ResponseEntity<?> getKanjiAi(@PathVariable String character) {
        try {
            String json = groqService.getKanjiDetails(character);
            if (json != null) {
                json = json.replaceAll("```json\\s*", "").replaceAll("```\\s*", "").trim();
            }
            return ResponseEntity.ok()
                    .header("Content-Type", "application/json")
                    .body(json);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("{\"error\":\"" + e.getMessage() + "\"}");
        }
    }
}
