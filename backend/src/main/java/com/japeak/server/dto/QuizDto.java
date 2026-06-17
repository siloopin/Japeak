package com.japeak.server.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

@Data
public class QuizDto {
    private Long id;
    private String type;
    private String question;
    private List<String> options;
    private String answer;
    private String word;
    private String reading;
    private String meaning;
    private String example_sentence;
    private String example_meaning;
    private List<Map<String, String>> kanji_words;
    private String new_difficulty;
}
