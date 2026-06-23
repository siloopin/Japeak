import { Platform } from 'react-native';

export type QuizDifficulty = 'Beginner' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface KanjiWord {
  word?: string;
  kanji?: string;
  reading: string;
  meaning: string;
  radical: string;
}

export interface GeneratedQuiz {
  id: number;
  type: 'word' | 'sentence';
  question: string;
  question_meaning?: string;
  options: string[];
  answer: string;
  word: string;
  reading?: string;
  meaning: string;
  example_sentence: string;
  example_meaning: string;
  kanji_words: KanjiWord[];
  new_difficulty: QuizDifficulty;
}

import Constants from 'expo-constants';

// 동적으로 현재 구동 중인 로컬 IP 주소를 가져와 백엔드 API URL로 설정합니다.
const debuggerHost = Constants.expoConfig?.hostUri;
const localIp = debuggerHost ? debuggerHost.split(':')[0] : 'localhost';
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || `http://${localIp}:8080`;

export const generateNextQuiz = async (
  token: string | null,
  currentDifficulty: QuizDifficulty,
  wasCorrect: boolean | null,
  consecutiveCorrect: number,
  recentWords: string[] = []
): Promise<GeneratedQuiz | null> => {
  if (!token) return null;
  try {
    let url = `${BASE_URL}/api/quiz/next?difficulty=${currentDifficulty}&consecutiveCorrect=${consecutiveCorrect}`;
    if (wasCorrect !== null) {
      url += `&wasCorrect=${wasCorrect}`;
    }
    if (recentWords && recentWords.length > 0) {
      url += `&recentWords=${encodeURIComponent(recentWords.join(','))}`;
    }
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const jsonStr = await response.text();
    
    if (!response.ok) {
      console.warn("Backend returned an error:", response.status, jsonStr);
      return null;
    }

    const parsed = JSON.parse(jsonStr);
    
    if (parsed && parsed.options && Array.isArray(parsed.options)) {
      parsed.options = parsed.options.sort(() => Math.random() - 0.5);
    } else {
      console.error("Backend returned invalid quiz format:", jsonStr);
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to fetch quiz from backend:", error);
    return null;
  }
};

export const submitQuizAnswer = async (token: string | null, quizId: number, isCorrect: boolean): Promise<void> => {
  if (!token) return;
  try {
    await fetch(`${BASE_URL}/api/quiz/answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quizId, isCorrect })
    });
  } catch (error) {
    console.error("Failed to submit answer:", error);
  }
};

export const getReviewQuizzes = async (token: string | null, mode: 'review_incorrect' | 'review_today'): Promise<GeneratedQuiz[]> => {
  if (!token) return [];
  try {
    const endpoint = mode === 'review_incorrect' ? '/api/quiz/review/incorrect' : '/api/quiz/review/today';
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) return [];
    
    const quizzes: GeneratedQuiz[] = await response.json();
    quizzes.forEach(q => {
      if (q.options) q.options = q.options.sort(() => Math.random() - 0.5);
    });
    return quizzes;
  } catch (error) {
    console.error("Failed to fetch review quizzes:", error);
    return [];
  }
};

export interface HistoryLogDto {
  logId: number;
  quizId: number;
  type: string;
  question: string;
  questionMeaning?: string;
  answer: string;
  word: string;
  reading?: string;
  meaning: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  isCorrect: boolean;
  answeredAt: string;
  dayStudied: number;
}

export const fetchQuizHistory = async (token: string | null, year: number, month: number): Promise<HistoryLogDto[]> => {
  if (!token) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/quiz/history?year=${year}&month=${month}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (!response.ok) {
      console.error('Failed to fetch history', response.status);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.error('fetchQuizHistory error:', error);
    return [];
  }
};

// JLPT 단어장 관련 인터페이스
export interface JlptWord {
  id: number;
  level: string;
  word: string;
  reading: string;
  meaning: string;
  day: string;
}

export interface DayGroup {
  day: string;
  words: JlptWord[];
}

// JLPT 단어장 API - 레벨별 단어 목록 조회
export const fetchVocabulary = async (token: string | null, level: string, page: number = 0): Promise<JlptWord[]> => {
  if (!token) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/vocabulary?level=${level}&page=${page}&size=50`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.content || data;
  } catch (error) {
    console.error('fetchVocabulary error:', error);
    return [];
  }
};

// JLPT 단어장 API - Day별 그룹핑된 단어 목록 조회
export const fetchVocabularyDays = async (token: string | null, level: string): Promise<DayGroup[]> => {
  if (!token) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/vocabulary/days?level=${level}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('fetchVocabularyDays error:', error);
    return [];
  }
};

// JLPT 단어장 API - 단어 검색
export const searchVocabulary = async (token: string | null, query: string): Promise<JlptWord[]> => {
  if (!token) return [];
  try {
    const response = await fetch(`${BASE_URL}/api/vocabulary/search?q=${encodeURIComponent(query)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('searchVocabulary error:', error);
    return [];
  }
};

export interface KanjiInfo {
  kanji: string;
  meaning: string;
}

export interface KanjiAiInfo {
  onyomi: string;
  kunyomi: string;
  radical: string;
}

export const fetchKanjiFromDB = async (token: string | null, character: string): Promise<KanjiInfo | null> => {
  if (!token) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/kanji/${encodeURIComponent(character)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.status === 404) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
};

export const fetchKanjiFromAI = async (token: string | null, character: string): Promise<KanjiAiInfo> => {
  if (!token) throw new Error("Token is missing");
  const res = await fetch(`${BASE_URL}/api/kanji/ai/${encodeURIComponent(character)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "서버 응답 오류");
  }
  return await res.json();
};
