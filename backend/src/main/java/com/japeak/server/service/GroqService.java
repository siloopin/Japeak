package com.japeak.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

@Service
public class GroqService {

    private final WebClient webClient;

    @Value("${groq.api.key}")
    private String apiKey;

    @Value("${groq.api.url}")
    private String apiUrl;

    public GroqService() {
        this.webClient = WebClient.builder().build();
    }

    public String generateQuiz(String currentDifficulty, Boolean wasCorrect, int consecutiveCorrect, boolean isSimple) {
        String basePrompt;
        if (isSimple) {
            basePrompt = String.format("""
                You are an expert Japanese language instructor. 
                Generate a SIMPLE Japanese vocabulary quiz.
                
                Current Difficulty: %s
                Previous Answer Correct: %s
                Consecutive Correct Answers: %d
                
                Instructions:
                0. Difficulty: If 'Beginner', provide VERY basic beginner Japanese words. Otherwise, follow JLPT standards.
                1. If consecutive correct answers is high, you may slightly increase difficulty (e.g. Beginner -> N5) in 'new_difficulty'. Otherwise maintain or decrease.
                2. Type is always 'word'.
                3. 'question' is the JAPANESE word (Kanji/Hiragana). 
                4. 'options' MUST be 4 KOREAN meanings. 'answer' MUST be the correct KOREAN meaning. DO NOT USE ENGLISH.
                5. Provide an 'example_sentence' in Japanese using the target word, and 'example_meaning' in KOREAN.
                6. In 'kanji_words', provide an array of objects for EVERY Japanese word containing Kanji in the 'example_sentence'. For each word, provide 'word', 'reading' (hiragana), 'meaning' (KOREAN), and 'radical' (KOREAN description).
                7. Return a valid JSON object.
                
                JSON format:
                {
                  "type": "word",
                  "question": "string",
                  "options": ["string", "string", "string", "string"],
                  "answer": "string",
                  "word": "target japanese word",
                  "reading": "hiragana reading of the target word",
                  "meaning": "korean meaning",
                  "example_sentence": "japanese sentence",
                  "example_meaning": "korean translation",
                  "kanji_words": [
                    { "word": "string", "reading": "string", "meaning": "string", "radical": "string" }
                  ],
                  "new_difficulty": "Beginner" | "N5" | "N4" | "N3" | "N2" | "N1"
                }
                """, currentDifficulty, wasCorrect == null ? "N/A" : wasCorrect.toString(), consecutiveCorrect);
        } else {
            basePrompt = String.format("""
                You are an expert Japanese language instructor. 
                Generate a COMPLEX Japanese vocabulary or sentence quiz.
                
                Current Difficulty: %s
                Previous Answer Correct: %s
                Consecutive Correct Answers: %d
                
                Instructions:
                0. Difficulty: If 'Beginner', provide VERY basic beginner Japanese. Otherwise, follow JLPT standards.
                1. Adjust 'new_difficulty' based on performance.
                2. Type randomly 'word' or 'sentence'.
                3. If type is 'word', 'question' is the JAPANESE word. If type is 'sentence', 'question' is a Japanese sentence with a blank (e.g. _____).
                4. 'options' MUST be 4 KOREAN meanings or words. 'answer' MUST be the correct KOREAN option. DO NOT USE ENGLISH.
                5. Provide an 'example_sentence' in Japanese using the target word, and 'example_meaning' in KOREAN.
                6. In 'kanji_words', provide an array of objects for EVERY Japanese word containing Kanji in the 'example_sentence'. For each word, provide 'word', 'reading' (hiragana), 'meaning' (KOREAN), and 'radical' (KOREAN description).
                7. Return a valid JSON object matching exactly this structure.
                
                JSON format:
                {
                  "type": "word" | "sentence",
                  "question": "string",
                  "options": ["string", "string", "string", "string"],
                  "answer": "string",
                  "word": "target japanese word",
                  "reading": "hiragana reading of the target word",
                  "meaning": "korean meaning",
                  "example_sentence": "japanese sentence",
                  "example_meaning": "korean translation",
                  "kanji_words": [
                    { "word": "string", "reading": "string", "meaning": "string", "radical": "string" }
                  ],
                  "new_difficulty": "Beginner" | "N5" | "N4" | "N3" | "N2" | "N1"
                }
                """, currentDifficulty, wasCorrect == null ? "N/A" : wasCorrect.toString(), consecutiveCorrect);
        }

        Map<String, Object> requestBody = Map.of(
            "model", "llama3-70b-8192",
            "messages", List.of(
                Map.of("role", "system", "content", "You are a helpful assistant that always outputs pure JSON."),
                Map.of("role", "user", "content", basePrompt)
            ),
            "response_format", Map.of("type", "json_object")
        );

        Map response = webClient.post()
                .uri(apiUrl)
                .header("Authorization", "Bearer " + apiKey)
                .header("Content-Type", "application/json")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(Map.class)
                .block();

        try {
            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            return ((String) message.get("content")).trim();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse Groq API response", e);
        }
    }
}
