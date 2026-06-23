package com.japeak.server.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "kanji_dictionary")
@Getter @Setter
@NoArgsConstructor
public class KanjiDictionary {

    @Id
    @Column(length = 50)
    private String kanji;

    @Column(nullable = false, length = 255)
    private String meaning;
}
