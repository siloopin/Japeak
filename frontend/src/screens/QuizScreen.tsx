import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, ScrollView, Modal, TouchableWithoutFeedback } from 'react-native';
import { BlurView } from 'expo-blur';
import { generateNextQuiz, submitQuizAnswer, getReviewQuizzes, GeneratedQuiz, QuizDifficulty, KanjiWord } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';

type QuizScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Quiz'>;
type QuizScreenRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

type Props = {
  navigation: QuizScreenNavigationProp;
  route: QuizScreenRouteProp;
};

export default function QuizScreen({ navigation, route }: Props) {
  const mode = route.params?.mode || 'normal';
  const { token } = useAuthStore();
  
  const [questions, setQuestions] = useState<GeneratedQuiz[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(mode === 'normal' ? 20 : 0);
  const [currentDifficulty, setCurrentDifficulty] = useState<QuizDifficulty>(route.params?.initialDifficulty || 'N5');
  const [consecutiveCorrect, setConsecutiveCorrect] = useState(0);
  
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isSavingNotion, setIsSavingNotion] = useState(false);
  const [isFetchingNext, setIsFetchingNext] = useState(false);
  
  const [selectedKanji, setSelectedKanji] = useState<KanjiWord | null>(null);

  // 초기 퀴즈 로딩
  useEffect(() => {
    if (mode === 'normal') {
      loadNextQuiz(null);
    } else {
      loadReviewQuizzes();
    }
  }, []);

  const loadReviewQuizzes = async () => {
    setIsFetchingNext(true);
    const quizzes = await getReviewQuizzes(token, mode as any);
    if (quizzes.length === 0) {
      Alert.alert('알림', '복습할 문제가 없습니다.', [{ text: '홈으로', onPress: () => navigation.goBack() }]);
    } else {
      setQuestions(quizzes);
      setTotalQuestions(quizzes.length);
    }
    setIsFetchingNext(false);
  };

  const loadNextQuiz = async (previousCorrect: boolean | null) => {
    if (mode !== 'normal') return;
    setIsFetchingNext(true);
    const newQuiz = await generateNextQuiz(token, currentDifficulty, previousCorrect, consecutiveCorrect);
    
    if (newQuiz) {
      setQuestions(prev => [...prev, newQuiz]);
      setCurrentDifficulty(newQuiz.new_difficulty);
    } else {
      Alert.alert('오류', '퀴즈를 가져오는데 실패했습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    }
    setIsFetchingNext(false);
  };

  const handleSelectOption = async (option: string) => {
    if (selectedOption !== null) return; 

    const currentQuiz = questions[currentIndex];
    setSelectedOption(option);
    
    const correct = option === currentQuiz.answer;
    setIsCorrect(correct);

    // 서버에 정답 여부 전송
    submitQuizAnswer(token, currentQuiz.id, correct);

    if (correct) {
      setConsecutiveCorrect(prev => prev + 1);
    } else {
      setConsecutiveCorrect(0);
    }

    // 일반 모드일 때만 다음 문제를 미리 로딩
    if (mode === 'normal' && currentIndex < totalQuestions - 1) {
      loadNextQuiz(correct);
    }
  };

  const handleNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
    } else {
      Alert.alert('학습 완료!', '모든 퀴즈를 완료했습니다! 고생하셨습니다 🎉', [
        { text: '홈으로', onPress: () => navigation.goBack() }
      ]);
    }
  };

  if (questions.length === 0 || currentIndex >= questions.length) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>AI가 맞춤형 퀴즈를 생성 중입니다...</Text>
      </View>
    );
  }

  const currentQuiz = questions[currentIndex];
  const progress = ((currentIndex) / totalQuestions) * 100;

  const renderWithKanjiHighlight = (text: string, textStyle: any, highlightStyle: any = styles.kanjiHighlight) => {
    if (!text || !currentQuiz.kanji_words || currentQuiz.kanji_words.length === 0) {
      return <Text style={textStyle}>{text}</Text>;
    }

    const words = currentQuiz.kanji_words.map(k => k.word).filter(Boolean);
    if (words.length === 0) return <Text style={textStyle}>{text}</Text>;

    const regex = new RegExp(`(${words.join('|')})`, 'g');
    const parts = text.split(regex);

    return (
      <Text style={textStyle}>
        {parts.map((part, index) => {
          const kanjiMatch = currentQuiz.kanji_words.find(k => k.word === part);
          if (kanjiMatch) {
            return (
              <Text 
                key={index} 
                style={[highlightStyle, { fontSize: textStyle?.fontSize || 16 }]} 
                onPress={() => setSelectedKanji(kanjiMatch)}
              >
                {part}
              </Text>
            );
          }
          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <LinearGradient
            colors={['#3B82F6', '#60A5FA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.progressFill, { width: `${progress}%` }]}
          />
        </View>
        <Text style={styles.progressText}>{currentIndex + 1} / {totalQuestions}</Text>
      </View>

      <View style={styles.difficultyBadge}>
        <Text style={styles.difficultyText}>현재 난이도: {currentDifficulty}</Text>
      </View>

      <View style={styles.quizContainer}>
        <Text style={styles.questionType}>
          {currentQuiz.type === 'word' ? '다음 단어의 뜻은?' : '다음 문장의 빈칸에 들어갈 말은?'}
        </Text>
        {currentQuiz.type === 'word' ? (
          renderWithKanjiHighlight(currentQuiz.word || currentQuiz.question, [styles.questionText, { fontSize: 42, marginTop: 10 }], [styles.kanjiHighlight, { color: '#2563EB' }])
        ) : (
          renderWithKanjiHighlight(currentQuiz.question, styles.questionText, [styles.kanjiHighlight, { color: '#2563EB' }])
        )}
      </View>

      <ScrollView contentContainerStyle={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {currentQuiz.options.map((option) => {
          let btnStyle = [styles.optionButton];
          let textStyle = [styles.optionText];

          if (selectedOption) {
            if (option === currentQuiz.answer) {
              btnStyle.push(styles.optionCorrect);
              textStyle.push(styles.textCorrect);
            } else if (option === selectedOption) {
              btnStyle.push(styles.optionIncorrect);
              textStyle.push(styles.textIncorrect);
            } else {
              btnStyle.push(styles.optionDisabled);
            }
          }

          return (
            <TouchableOpacity
              key={option}
              style={btnStyle}
              activeOpacity={0.7}
              onPress={() => handleSelectOption(option)}
              disabled={selectedOption !== null}
            >
              <Text style={textStyle}>{option}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Feedback & Next Button */}
      {selectedOption !== null && (
        <View style={[styles.feedbackContainer, isCorrect ? styles.feedbackCorrectBg : styles.feedbackIncorrectBg]}>
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.feedbackTitle, isCorrect ? styles.feedbackCorrectText : styles.feedbackIncorrectText]}>
              {isCorrect ? '정답입니다! 🎉' : '틀렸습니다 😢'}
            </Text>
            
            {/* 정답/오답 상세 정보 및 예문 */}
            <View style={styles.exampleContainer}>
              <Text style={styles.wordInfo}>
                <Text style={{ fontWeight: 'bold' }}>{renderWithKanjiHighlight(currentQuiz.word, null, [styles.kanjiHighlight, { color: '#059669' }])}</Text>
                {currentQuiz.reading ? ` (${currentQuiz.reading})` : ''} : {currentQuiz.meaning}
              </Text>
              {isCorrect && currentQuiz.example_sentence && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleTitle}>💡 활용 예문</Text>
                  {renderWithKanjiHighlight(currentQuiz.example_sentence, styles.exampleJp)}
                  <Text style={styles.exampleKo}>{currentQuiz.example_meaning}</Text>
                </View>
              )}
            </View>

          <TouchableOpacity 
            style={[styles.nextButton, isCorrect ? styles.nextButtonCorrect : styles.nextButtonIncorrect]} 
            onPress={handleNext}
            disabled={isFetchingNext && currentIndex < totalQuestions - 1}
          >
            {isFetchingNext && currentIndex < totalQuestions - 1 ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.nextButtonText}>계속하기</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      )}
      {/* 한자 상세 정보 모달 */}
      <Modal
        visible={!!selectedKanji}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedKanji(null)}
      >
        <BlurView intensity={30} tint="dark" style={styles.modalOverlay}>
          <TouchableOpacity style={{flex: 1, width: '100%', justifyContent: 'flex-end'}} activeOpacity={1} onPress={() => setSelectedKanji(null)}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalWord}>{selectedKanji?.word}</Text>
                  <Text style={styles.modalReading}>{selectedKanji?.reading}</Text>
                </View>
                <Text style={styles.modalMeaning}>{selectedKanji?.meaning}</Text>
                
                {selectedKanji?.radical && (
                  <View style={styles.radicalBox}>
                    <Text style={styles.radicalLabel}>부수 정보</Text>
                    <Text style={styles.radicalText}>{selectedKanji.radical}</Text>
                  </View>
                )}

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setSelectedKanji(null)}>
                  <Text style={styles.modalCloseText}>닫기</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </TouchableOpacity>
        </BlurView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  loadingText: {
    marginTop: 16,
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: '#E5E7EB',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressText: {
    color: '#6B7280',
    fontWeight: 'bold',
  },
  difficultyBadge: {
    alignSelf: 'center',
    marginTop: 16,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  difficultyText: {
    color: '#3B82F6',
    fontWeight: '700',
    fontSize: 13,
  },
  quizContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  questionType: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
  },
  questionText: {
    color: '#111827',
    fontSize: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 200, // 하단 피드백 영역 공간 확보
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  optionText: {
    color: '#374151',
    fontSize: 18,
    fontWeight: '700',
  },
  optionCorrect: {
    backgroundColor: '#ECFDF5',
    borderColor: '#10B981',
  },
  textCorrect: {
    color: '#059669',
  },
  optionIncorrect: {
    backgroundColor: '#FEF2F2',
    borderColor: '#EF4444',
  },
  textIncorrect: {
    color: '#DC2626',
  },
  optionDisabled: {
    opacity: 0.5,
  },
  feedbackContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 24,
    paddingBottom: 40,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 10,
  },
  feedbackCorrectBg: {
    backgroundColor: '#ECFDF5',
    borderTopWidth: 1,
    borderColor: '#D1FAE5',
  },
  feedbackIncorrectBg: {
    backgroundColor: '#FEF2F2',
    borderTopWidth: 1,
    borderColor: '#FEE2E2',
  },
  feedbackTitle: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 8,
  },
  feedbackCorrectText: {
    color: '#059669',
  },
  feedbackIncorrectText: {
    color: '#DC2626',
  },
  exampleContainer: {
    marginTop: 8,
  },
  wordInfo: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  exampleBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  exampleJp: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  exampleKo: {
    fontSize: 14,
    color: '#4B5563',
  },
  nextButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonCorrect: {
    backgroundColor: '#10B981',
  },
  nextButtonIncorrect: {
    backgroundColor: '#EF4444',
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  kanjiHighlight: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 8,
    gap: 12,
  },
  modalWord: {
    fontSize: 36,
    fontWeight: '900',
    color: '#111827',
  },
  modalReading: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3B82F6',
    marginBottom: 4,
  },
  modalMeaning: {
    fontSize: 18,
    color: '#4B5563',
    fontWeight: '600',
    marginBottom: 20,
  },
  radicalBox: {
    backgroundColor: '#F3F4F6',
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
  },
  radicalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6B7280',
    marginBottom: 6,
  },
  radicalText: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
    lineHeight: 24,
  },
  modalCloseBtn: {
    backgroundColor: '#111827',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  }
});
