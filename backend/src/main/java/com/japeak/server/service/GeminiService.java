package com.japeak.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import java.util.Map;
import java.util.List;

@Service
public class GeminiService {

    private final WebClient webClient;

    @Value("${gemini.api.key}")
    private String apiKey;

    @Value("${gemini.api.url}")
    private String apiUrl;

    public GeminiService() {
        this.webClient = WebClient.builder().build();
    }

    public String generateQuiz(String currentDifficulty, Boolean wasCorrect, int consecutiveCorrect) {
        String prompt = String.format("""
            You are an expert Japanese language instructor. 
            Generate a Japanese vocabulary or sentence fill-in-the-blank quiz question.
            
            Current Difficulty: %s
            Previous Answer Correct: %s
            Consecutive Correct Answers: %d
            
            Instructions:
            0. Note on Difficulty: If the difficulty is 'Beginner', provide VERY basic beginner Japanese (e.g. Hiragana/Katakana level words, simple greetings like 'こんにちは', or very basic nouns like '水', '猫'). Otherwise, follow JLPT standards (N5, N4, etc.).
            1. If the user answered correctly consecutively, you may slightly increase the difficulty (e.g. Beginner -> N5, or N5 -> N4) in the 'new_difficulty' field. If they answered incorrectly, decrease or maintain it.
            2. The quiz 'type' should randomly be either 'word' (guessing meaning of a Japanese word) or 'sentence' (fill in the blank with appropriate Japanese word). For 'Beginner', prefer 'word' type.
            3. For 'word' type: 'question' is the Japanese word (e.g. "食べる"). 'options' are 4 Korean meanings. 'answer' is the correct Korean meaning.
            4. For 'sentence' type: 'question' is a Japanese sentence with a blank "___" (e.g. "明日、映画を___つもりです。"). 'options' are 4 Japanese words. 'answer' is the correct Japanese word.
            5. Provide an 'example_sentence' in Japanese using the target word, and 'example_meaning' in Korean.
            6. In 'kanji_words', provide an array of objects for EVERY Japanese word containing Kanji that appears in the 'example_sentence'. For each word, provide the word itself, its hiragana 'reading', its korean 'meaning', and the 'radical' of the kanjis used (e.g. "週: 辶(책받침), 末: 木(나무목)"). If no Kanji exists, return an empty array.
            7. Return ONLY a valid raw JSON object matching the exact structure requested, without any markdown formatting.
            
            JSON format:
            {
              "type": "word" | "sentence",
              "question": "string",
              "options": ["string", "string", "string", "string"],
              "answer": "string",
              "word": "target japanese word",
              "meaning": "korean meaning of the target word",
              "example_sentence": "example sentence using the word",
              "example_meaning": "korean translation of the example sentence",
              "kanji_words": [
                {
                  "word": "string",
                  "reading": "string",
                  "meaning": "string",
                  "radical": "string"
                }
              ],
              "new_difficulty": "Beginner" | "N5" | "N4" | "N3" | "N2" | "N1"
            }
            """, currentDifficulty, wasCorrect == null ? "N/A" : wasCorrect.toString(), consecutiveCorrect);

        Map<String, Object> requestBody = Map.of(
            "contents", List.of(
                Map.of("parts", List.of(Map.of("text", prompt)))
            )
        );

        Map response = webClient.post()
                .uri(apiUrl + "?key=" + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        try {
            // Extract the text content from Gemini's response structure
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            String text = (String) parts.get(0).get("text");
            
            text = text.trim();
            if (text.startsWith("```json")) {
                text = text.substring(7);
            } else if (text.startsWith("```")) {
                text = text.substring(3);
            }
            if (text.endsWith("```")) {
                text = text.substring(0, text.length() - 3);
            }
            return text.trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Gemini API response", e);
        }
    }
}
