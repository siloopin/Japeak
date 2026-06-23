import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator, TouchableWithoutFeedback, Alert } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useAuthStore } from '../store/authStore';
import { fetchKanjiFromDB, fetchKanjiFromAI, KanjiInfo, KanjiAiInfo } from '../utils/api';

interface Props {
  visible: boolean;
  character: string;
  onClose: () => void;
}

export default function KanjiBottomSheet({ visible, character, onClose }: Props) {
  const { token } = useAuthStore();
  const [dbInfo, setDbInfo] = useState<KanjiInfo | null>(null);
  const [aiInfo, setAiInfo] = useState<KanjiAiInfo | null>(null);
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [isLoadingAi, setIsLoadingAi] = useState(false);

  useEffect(() => {
    if (visible && character) {
      setDbInfo(null);
      setAiInfo(null);
      fetchDbInfo();
    }
  }, [visible, character]);

  const fetchDbInfo = async () => {
    setIsLoadingDb(true);
    const info = await fetchKanjiFromDB(token, character);
    setDbInfo(info);
    setIsLoadingDb(false);
  };

  const handleFetchAi = async () => {
    setIsLoadingAi(true);
    try {
      const info = await fetchKanjiFromAI(token, character);
      setAiInfo(info);
    } catch (e: any) {
      Alert.alert("AI 호출 실패", e.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setIsLoadingAi(false);
    }
  };

  const speakCharacter = () => {
    Speech.speak(character, { language: 'ja-JP' });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              {/* 글래스모피즘 효과 */}
              <BlurView intensity={80} tint="light" style={styles.blurView}>
                <View style={styles.content}>
                  {/* 한자 및 발음 버튼 */}
                  <View style={styles.kanjiHeader}>
                    <Text style={styles.kanjiCharacter}>{character}</Text>
                    <TouchableOpacity onPress={speakCharacter} style={styles.speakerButton}>
                      <Ionicons name="volume-medium" size={32} color="#3B82F6" />
                    </TouchableOpacity>
                  </View>

                  {/* 한국어 뜻 */}
                  {isLoadingDb ? (
                    <ActivityIndicator size="small" color="#3B82F6" style={{ marginVertical: 10 }} />
                  ) : (
                    <Text style={styles.kanjiMeaning}>{dbInfo ? dbInfo.meaning : '뜻을 찾을 수 없습니다.'}</Text>
                  )}

                  {/* 구분선 */}
                  <View style={styles.divider} />

                  {/* AI 음독/훈독/부수 */}
                  {aiInfo ? (
                    <View style={styles.aiResultContainer}>
                      <View style={styles.aiRow}>
                        <Text style={styles.aiLabel}>음독</Text>
                        <Text style={styles.aiValue}>{aiInfo.onyomi || '-'}</Text>
                      </View>
                      <View style={styles.aiRow}>
                        <Text style={styles.aiLabel}>훈독</Text>
                        <Text style={styles.aiValue}>{aiInfo.kunyomi || '-'}</Text>
                      </View>
                      <View style={styles.aiRow}>
                        <Text style={styles.aiLabel}>부수</Text>
                        <Text style={styles.aiValue}>{aiInfo.radical || '-'}</Text>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity style={styles.aiButton} onPress={handleFetchAi} disabled={isLoadingAi}>
                      {isLoadingAi ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.aiButtonText}>AI로 음독/훈독/부수 알아보기</Text>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              </BlurView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
    paddingBottom: 40,
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  blurView: {
    padding: 24,
    alignItems: 'center',
  },
  content: {
    padding: 24,
    alignItems: 'center',
  },
  kanjiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kanjiCharacter: {
    fontSize: 64,
    fontWeight: '700',
    color: '#111827',
  },
  speakerButton: {
    marginLeft: 12,
    padding: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
  },
  kanjiMeaning: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 20,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginVertical: 20,
  },
  aiButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  aiButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aiResultContainer: {
    width: '100%',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  aiRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  aiLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  aiValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: 'bold',
  },
});
