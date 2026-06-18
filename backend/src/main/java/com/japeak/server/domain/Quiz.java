package com.japeak.server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "quizzes")
@Getter @Setter
@NoArgsConstructor
public class Quiz {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String difficulty; // Beginner, N5, N4, etc.

    @Column(nullable = false)
    private String type; // word or sentence

    @Column(nullable = false, columnDefinition = "TEXT")
    private String question;

    @Column(nullable = false)
    private String answer;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String optionsJson; // ["option1", "option2", ...]

    // Explanation details
    private String word;
    private String reading;
    private String meaning;

    @Column(columnDefinition = "TEXT")
    private String questionMeaning;
    
    @Column(columnDefinition = "TEXT")
    private String exampleSentence;
    
    @Column(columnDefinition = "TEXT")
    private String exampleMeaning;

    @Column(columnDefinition = "TEXT")
    private String kanjiWordsJson; // array of KanjiWord objects

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
