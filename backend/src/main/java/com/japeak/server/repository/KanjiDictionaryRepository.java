package com.japeak.server.repository;

import com.japeak.server.domain.KanjiDictionary;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KanjiDictionaryRepository extends JpaRepository<KanjiDictionary, String> {
}
