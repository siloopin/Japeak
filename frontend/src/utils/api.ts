import { Platform } from 'react-native';

export type QuizDifficulty = 'Beginner' | 'N5' | 'N4' | 'N3' | 'N2' | 'N1';

export interface KanjiWord {
  word: string;
  reading: string;
  meaning: string;
  radical: string;
}

export interface GeneratedQuiz {
  id: number;
  type: 'word' | 'sentence';
  question: string;
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

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';

export const generateNextQuiz = async (
  token: string | null,
  currentDifficulty: QuizDifficulty,
  wasCorrect: boolean | null,
  consecutiveCorrect: number
): Promise<GeneratedQuiz | null> => {
  try {
    let url = `${BASE_URL}/api/quiz/next?difficulty=${currentDifficulty}&consecutiveCorrect=${consecutiveCorrect}`;
    if (wasCorrect !== null) {
      url += `&wasCorrect=${wasCorrect}`;
    }

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    const jsonStr = await response.text();
    
    if (!response.ok) {
      console.error("Backend returned an error:", response.status, jsonStr);
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
  answer: string;
  word: string;
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
