import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useAuthStore } from '../store/authStore';

const LEVELS = [
  { id: 'Beginner', title: '완전 생초보 (히라가나/가타카나)' },
  { id: 'N5', title: '기초 (JLPT N5)' },
  { id: 'N4', title: '초급 (JLPT N4)' },
  { id: 'N3', title: '중급 (JLPT N3)' },
  { id: 'N2', title: '고급 (JLPT N2)' },
  { id: 'N1', title: '마스터 (JLPT N1)' },
];

export default function LevelSelectScreen() {
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { token, updateUser } = useAuthStore();

  const handleSave = async () => {
    if (!selectedLevel) return;

    setIsSaving(true);
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080';
    
    try {
      const response = await fetch(`${API_URL}/api/auth/difficulty`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ difficulty: selectedLevel }),
      });

      const data = await response.json();
      if (response.ok) {
        updateUser(data.user);
      } else {
        Alert.alert('오류', '난이도 설정에 실패했습니다.');
      }
    } catch (error) {
      Alert.alert('오류', '서버와 연결할 수 없습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>현재 일본어 실력이{'\n'}어느 정도이신가요?</Text>
      <Text style={styles.subtitle}>Japeak AI가 실력에 맞는 맞춤형 퀴즈를 준비합니다.</Text>

      <ScrollView contentContainerStyle={styles.list}>
        {LEVELS.map((level) => (
          <TouchableOpacity 
            key={level.id}
            style={[styles.levelBtn, selectedLevel === level.id && styles.levelBtnActive]}
            onPress={() => setSelectedLevel(level.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.levelText, selectedLevel === level.id && styles.levelTextActive]}>
              {level.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity 
        style={[styles.submitButton, !selectedLevel && styles.submitButtonDisabled]}
        disabled={!selectedLevel || isSaving}
        onPress={handleSave}
      >
        {isSaving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitText}>시작하기</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 30,
    paddingTop: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    lineHeight: 38,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 40,
  },
  list: {
    gap: 12,
    paddingBottom: 40,
  },
  levelBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 20,
    borderRadius: 16,
  },
  levelBtnActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  levelTextActive: {
    color: '#3B82F6',
    fontWeight: '800',
  },
  submitButton: {
    backgroundColor: '#3B82F6',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  }
});
