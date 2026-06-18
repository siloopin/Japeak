package com.japeak.server.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class HistoryLogDto {
    private Long logId;
    private Long quizId;
    private String type;
    private String question;
    private String questionMeaning;
    private String answer;
    private String word;
    private String reading;
    private String meaning;
    private String exampleSentence;
    private String exampleMeaning;
    private Boolean isCorrect;
    private LocalDateTime answeredAt;
    private long dayStudied;
}
