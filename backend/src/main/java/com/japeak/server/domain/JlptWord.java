package com.japeak.server.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "jlpt_words")
@Getter @Setter
@NoArgsConstructor
public class JlptWord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String level; // N5, N4, N3, N2, N1

    @Column(nullable = false)
    private String word; // 漢字 표기 (例: 食べる)

    @Column(nullable = false)
    private String reading; // ひらがな 읽기 (例: たべる)

    @Column(nullable = false)
    private String meaning; // 한국어 뜻 (例: 먹다)

    @Column(nullable = false)
    private String day; // Day01, Day02, ...
}
