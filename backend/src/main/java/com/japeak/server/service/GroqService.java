package com.japeak.server.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

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
        this.webClient = WebClient.builder()
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
    }

    /**
     * Groq API를 사용하여 일본어 퀴즈를 생성합니다.
     * isSimple=true: 단어형 퀴즈 (word)
     * isSimple=false: 단어 또는 문장형 퀴즈 (word/sentence)
     */
    public String generateQuiz(String currentDifficulty, Boolean wasCorrect, int consecutiveCorrect, boolean isSimple, String recentWords) {
        String prompt;

        if (isSimple) {
            // 단어형 퀴즈 프롬프트
            prompt = String.format("""
                あなたは日本語の先生です。韓国人学生のために日本語の単語クイズを1つ作ってください。

                難易度: %s
                前回正解: %s
                連続正解数: %d

                ルール:
                - 次の単語は使わないでください: [%s]
                - questionには日本語の単語を入れてください（漢字がある場合は漢字で書く）
                - optionsには韓国語の意味を4つ入れてください。正解1つと不正解3つです
                - answerにはoptionsの中から正解の韓国語を入れてください
                - question_meaningにはquestionの韓国語の意味を入れてください
                - wordにはquestionと同じ日本語の単語を入れてください
                - readingにはひらがなの読み方を入れてください
                - meaningには韓国語の意味を入れてください
                - example_sentenceにはその単語を使った日本語の例文を入れてください
                - example_meaningには例文の韓国語訳を入れてください
                - kanji_wordsにはクイズ全体（question, example_sentence）に出てくる漢字を含む単語をすべて入れてください
                  - word: 漢字を含む単語
                  - reading: ひらがなの読み方
                  - meaning: 韓国語の意味
                  - radical: 漢字の部首の説明（韓国語で。例: "食: 食(먹을 식)"）

                難易度の説明:
                - Beginner: こんにちは、水、猫 などの超基本単語
                - N5: 基本的な日常単語
                - N4: 初中級単語
                - N3以上: 中上級単語

                次のJSON形式で回答してください:
                {
                  "type": "word",
                  "question": "食べる",
                  "options": ["먹다", "마시다", "자다", "걷다"],
                  "answer": "먹다",
                  "question_meaning": "먹다",
                  "word": "食べる",
                  "reading": "たべる",
                  "meaning": "먹다",
                  "example_sentence": "朝ごはんを食べる。",
                  "example_meaning": "아침밥을 먹다.",
                  "kanji_words": [
                    {"word": "食べる", "reading": "たべる", "meaning": "먹다", "radical": "食: 食(먹을 식)"},
                    {"word": "朝", "reading": "あさ", "meaning": "아침", "radical": "月(달 월)"}
                  ],
                  "new_difficulty": "%s"
                }
                """, currentDifficulty, wasCorrect == null ? "N/A" : wasCorrect.toString(), consecutiveCorrect, recentWords, currentDifficulty);
        } else {
            // 복합형 퀴즈 프롬프트 (단어 or 문장)
            prompt = String.format("""
                あなたは日本語の先生です。韓国人学生のために日本語クイズを1つ作ってください。
                クイズの種類は "word"(単語の意味を当てる) か "sentence"(文の空欄を埋める) のどちらかをランダムに選んでください。

                難易度: %s
                前回正解: %s
                連続正解数: %d

                ルール:
                - 次の単語は使わないでください: [%s]

                【wordタイプの場合】
                - questionに日本語の単語を入れる
                - optionsに韓国語の意味を4つ入れる（正解1つ+不正解3つ）
                - answerに正解の韓国語を入れる

                【sentenceタイプの場合】
                - questionに空欄「_____」を含む日本語の文を入れる（例: 「明日、映画を_____つもりです。」）
                - optionsに日本語の単語を4つ入れる（正解1つ+不正解3つ）
                - answerに正解の日本語の単語を入れる

                【共通ルール】
                - question_meaning: questionの韓国語訳（sentenceタイプの場合、空欄部分は「___」のままにする）
                - word: 対象の日本語単語
                - reading: ひらがなの読み方
                - meaning: 韓国語の意味
                - example_sentence: その単語を使った日本語の例文
                - example_meaning: 例文の韓国語訳
                - kanji_words: クイズ全体（question, example_sentence, options）に出てくる漢字を含む単語をすべてリストアップ
                  - word: 漢字を含む単語
                  - reading: ひらがなの読み方
                  - meaning: 韓国語の意味
                  - radical: 漢字の部首の説明（韓国語。例: "食: 食(먹을 식)"）

                連続正解数が高ければnew_difficultyを上げてください（例: N5→N4）。
                間違えていたらnew_difficultyを下げるか維持してください。

                次のJSON形式で回答してください:
                {
                  "type": "word",
                  "question": "勉強する",
                  "options": ["공부하다", "운동하다", "요리하다", "청소하다"],
                  "answer": "공부하다",
                  "question_meaning": "공부하다",
                  "word": "勉強する",
                  "reading": "べんきょうする",
                  "meaning": "공부하다",
                  "example_sentence": "毎日日本語を勉強する。",
                  "example_meaning": "매일 일본어를 공부하다.",
                  "kanji_words": [
                    {"word": "勉強", "reading": "べんきょう", "meaning": "공부", "radical": "力(힘 력)"},
                    {"word": "毎日", "reading": "まいにち", "meaning": "매일", "radical": "日(날 일)"},
                    {"word": "日本語", "reading": "にほんご", "meaning": "일본어", "radical": "日(날 일), 本(근본 본), 語(말씀 어)"}
                  ],
                  "new_difficulty": "%s"
                }
                """, currentDifficulty, wasCorrect == null ? "N/A" : wasCorrect.toString(), consecutiveCorrect, recentWords, currentDifficulty);
        }

        Map<String, Object> requestBody = Map.of(
            "model", "llama-3.3-70b-versatile",
            "messages", List.of(
                Map.of("role", "system", "content", "You are a Japanese language quiz generator. You MUST output ONLY valid JSON. Do not include any explanation or markdown."),
                Map.of("role", "user", "content", prompt)
            ),
            "temperature", 0.3,
            "max_tokens", 2048,
            "response_format", Map.of("type", "json_object")
        );

        try {
            Map response = webClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = ((String) message.get("content")).trim();

            // 마크다운 코드블록 제거
            if (content.startsWith("```json")) {
                content = content.substring(7);
            } else if (content.startsWith("```")) {
                content = content.substring(3);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }

            return content.trim();
        } catch (WebClientResponseException e) {
            System.err.println("Groq API HTTP Error [" + e.getStatusCode() + "]: " + e.getResponseBodyAsString());
            throw new RuntimeException("Groq API Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            System.err.println("Groq API unexpected error: " + e.getMessage());
            throw new RuntimeException("Failed to call Groq API", e);
        }
    }

    public String getKanjiDetails(String kanji) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException("GROQ API Key is missing");
        }

        String systemPrompt = "You are a Japanese Kanji dictionary. Provide the onyomi(음독), kunyomi(훈독), and radical(부수) for the requested Kanji. Output ONLY valid JSON.";
        String userPrompt = "Provide details for the Kanji: " + kanji + "\n" +
                "Expected JSON format:\n" +
                "{\n" +
                "  \"onyomi\": \"ショウ\",\n" +
                "  \"kunyomi\": \"となえる\",\n" +
                "  \"radical\": \"口\"\n" +
                "}";

        Map<String, Object> requestBody = Map.of(
            "model", "llama-3.3-70b-versatile",
            "messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
            ),
            "temperature", 0.3,
            "max_tokens", 512,
            "response_format", Map.of("type", "json_object")
        );

        try {
            Map response = webClient.post()
                    .uri(apiUrl)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            List<Map<String, Object>> choices = (List<Map<String, Object>>) response.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = ((String) message.get("content")).trim();

            // 마크다운 코드블록 제거
            if (content.startsWith("```json")) {
                content = content.substring(7);
            } else if (content.startsWith("```")) {
                content = content.substring(3);
            }
            if (content.endsWith("```")) {
                content = content.substring(0, content.length() - 3);
            }

            return content.trim();
        } catch (WebClientResponseException e) {
            System.err.println("Groq API HTTP Error [" + e.getStatusCode() + "]: " + e.getResponseBodyAsString());
            throw new RuntimeException("Groq API Error: " + e.getStatusCode() + " - " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            System.err.println("Groq API unexpected error: " + e.getMessage());
            throw new RuntimeException("Failed to call Groq API", e);
        }
    }
}
