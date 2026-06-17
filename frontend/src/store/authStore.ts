import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QuizDifficulty } from '../utils/api';

export interface User {
  id: number;
  email: string;
  nickname: string;
  difficulty?: QuizDifficulty;
  createdAt: string;
  daysStudied: number;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  updateUser: (user: User) => void;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  setAuth: async (token, user) => {
    await AsyncStorage.setItem('token', token);
    set({ token, user, isLoading: false });
  },
  updateUser: (user) => {
    set({ user });
  },
  logout: async () => {
    await AsyncStorage.removeItem('token');
    set({ token: null, user: null });
  },
  checkAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        set({ isLoading: false });
        return;
      }
      
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        set({ token, user: data.user, isLoading: false });
      } else {
        await AsyncStorage.removeItem('token');
        set({ token: null, user: null, isLoading: false });
      }
    } catch (error) {
      console.error('Check Auth Error:', error);
      set({ isLoading: false });
    }
  }
}));
