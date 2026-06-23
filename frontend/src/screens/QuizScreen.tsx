import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, ScrollView, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateNextQuiz, submitQuizAnswer, getReviewQuizzes, GeneratedQuiz, QuizDifficulty } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import KanjiWord from '../components/KanjiWord';
import KanjiBottomSheet from '../components/KanjiBottomSheet';
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
  
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);

  const [recentWords, setRecentWords] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  // 결과 화면
  const [showResult, setShowResult] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  // 원그래프 애니메이션 값
  const pieAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;

  // 초기 퀴즈 로딩 및 세션 복구
  useEffect(() => {
    const initQuiz = async () => {
      if (mode === 'normal') {
        try {
          const savedSession = await AsyncStorage.getItem('@quiz_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            Alert.alert(
              '이전 퀴즈 복구',
              '이전에 풀던 일일 퀴즈가 있습니다. 이어서 진행하시겠습니까?',
              [
                {
                  text: '처음부터',
                  style: 'cancel',
                  onPress: () => {
                    AsyncStorage.removeItem('@quiz_session');
                    loadNextQuiz(null, [], 0, 'N5');
                  }
                },
                {
                  text: '이어하기',
                  onPress: () => {
                    setQuestions(parsed.questions);
                    setCurrentIndex(parsed.currentIndex);
                    setConsecutiveCorrect(parsed.consecutiveCorrect);
                    setCurrentDifficulty(parsed.currentDifficulty);
                    setRecentWords(parsed.recentWords || []);
                    // 다음 문제가 없는 경우 로드
                    if (parsed.questions.length <= parsed.currentIndex) {
                      loadNextQuiz(null, parsed.recentWords || [], parsed.consecutiveCorrect, parsed.currentDifficulty);
                    }
                  }
                }
              ]
            );
          } else {
            loadNextQuiz(null, [], 0, currentDifficulty);
          }
        } catch (e) {
          loadNextQuiz(null, [], 0, currentDifficulty);
        }
      } else {
        loadReviewQuizzes();
      }
    };
    initQuiz();
  }, []);

  // 상태 변경 시마다 세션 저장
  useEffect(() => {
    if (mode === 'normal' && questions.length > 0 && currentIndex < totalQuestions) {
      AsyncStorage.setItem('@quiz_session', JSON.stringify({
        questions,
        currentIndex,
        consecutiveCorrect,
        currentDifficulty,
        recentWords
      }));
    }
  }, [questions, currentIndex, consecutiveCorrect, currentDifficulty, recentWords]);

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

  const loadNextQuiz = async (
    previousCorrect: boolean | null, 
    currentRecentWords: string[] = recentWords,
    currentConsecutive: number = consecutiveCorrect,
    difficulty: QuizDifficulty = currentDifficulty
  ) => {
    if (mode !== 'normal') return;
    setIsFetchingNext(true);
    const newQuiz = await generateNextQuiz(token, difficulty, previousCorrect, currentConsecutive, currentRecentWords);
    
    if (newQuiz) {
      setQuestions(prev => [...prev, newQuiz]);
      setCurrentDifficulty(newQuiz.new_difficulty);
      
      // 이번 세션에서 출제된 단어는 모두 기억 (세션 내 중복 완전 방지)
      if (newQuiz.word) {
        setRecentWords(prev => {
          if (prev.includes(newQuiz.word)) return prev;
          return [...prev, newQuiz.word];
        });
      }
    } else {
      Alert.alert('오류', '퀴즈를 가져오는데 실패했습니다.', [
        { text: '확인', onPress: () => navigation.goBack() }
      ]);
    }
    setIsFetchingNext(false);
  };

  const handleSelectOption = async (option: string | null) => {
    if (selectedOption !== null) return; 

    const currentQuiz = questions[currentIndex];
    
    // 모르겠어요를 누른 경우 option은 null
    const isSkip = option === null;
    setSelectedOption(isSkip ? 'SKIP' : option);
    
    const correct = isSkip ? false : (option === currentQuiz.answer);
    setIsCorrect(correct);
    // 정답 누적 집계
    if (correct) setCorrectCount(prev => prev + 1);
    submitQuizAnswer(token, currentQuiz.id, correct);

    const nextConsecutive = correct ? consecutiveCorrect + 1 : 0;
    setConsecutiveCorrect(nextConsecutive);

    // 일반 모드일 때만 다음 문제를 미리 로딩
    if (mode === 'normal' && currentIndex < totalQuestions - 1) {
      loadNextQuiz(correct, recentWords, nextConsecutive, currentDifficulty);
    }
  };
  const handleNext = async () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsCorrect(null);
      setShowHint(false);
    } else {
      // 마지막 문제 → 결과 화면
      if (mode === 'normal') {
        await AsyncStorage.removeItem('@quiz_session');
      }
      // 마지막 문제 정답 여부 포함한 최종 집계
      const finalCorrect = correctCount + (isCorrect ? 1 : 0);
      setCorrectCount(finalCorrect);
      setShowResult(true);
      // 원그래프 + 점수 숫자 애니메이션 시작
      Animated.parallel([
        Animated.timing(pieAnim, {
          toValue: finalCorrect / totalQuestions,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(scoreAnim, {
          toValue: finalCorrect,
          duration: 1200,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }
  };

  if (questions.length === 0 || (!showResult && currentIndex >= questions.length)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>AI가 맞춤형 퀴즈를 생성 중입니다...</Text>
      </View>
    );
  }

  // ─── 결과 화면 ───
  if (showResult) {
    const ratio = correctCount / totalQuestions;
    const percentage = Math.round(ratio * 100);
    const SIZE = 220;
    const STROKE = 22;
    const R = (SIZE - STROKE) / 2;
    const CIRCUMFERENCE = 2 * Math.PI * R;

    let grade = ''; let gradeColor = '';
    if (percentage >= 90) { grade = '🏆 완벽해요!'; gradeColor = '#F59E0B'; }
    else if (percentage >= 70) { grade = '👍 잘했어요!'; gradeColor = '#10B981'; }
    else if (percentage >= 50) { grade = '💪 조금만 더!'; gradeColor = '#3B82F6'; }
    else { grade = '📚 복습이 필요해요'; gradeColor = '#EF4444'; }

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.resultContainer}>
          {/* 제목 */}
          <Text style={styles.resultTitle}>퀴즈 완료! 🎉</Text>
          <Text style={styles.resultSubtitle}>{totalQuestions}문제 중 결과</Text>

          {/* 원그래프 (SVG 없이 Animated + border 트릭) */}
          <View style={styles.pieWrapper}>
            {/* 배경 원 */}
            <View style={[styles.pieBase, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: STROKE, borderColor: '#E5E7EB' }]} />
            {/* 정답 호 - clip 트릭 */}
            {Array.from({ length: 360 }).map((_, deg) => {
              const segRatio = deg / 360;
              return (
                <Animated.View
                  key={deg}
                  style={[
                    styles.pieSeg,
                    {
                      width: SIZE,
                      height: SIZE,
                      borderRadius: SIZE / 2,
                      transform: [{ rotate: `${deg}deg` }],
                      opacity: pieAnim.interpolate({
                        inputRange: [Math.max(0, segRatio - 0.001), Math.min(1, segRatio + 0.001)],
                        outputRange: segRatio === 0 ? [1, 1] : [0, 1],
                        extrapolate: 'clamp',
                      }),
                    },
                  ]}
                />
              );
            })}
            {/* 중앙 숫자 */}
            <View style={styles.pieCenter}>
              <Animated.Text style={[styles.piePercent, { color: gradeColor }]}>
                {scoreAnim.interpolate({
                  inputRange: [0, totalQuestions],
                  outputRange: ['0%', `${percentage}%`],
                })}
              </Animated.Text>
              <Text style={styles.pieLabel}>{correctCount}/{totalQuestions}</Text>
            </View>
          </View>

          {/* 등급 */}
          <Text style={[styles.gradeText, { color: gradeColor }]}>{grade}</Text>

          {/* 상세 통계 */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: '#DCFCE7' }]}>
              <Text style={styles.statNum}>{correctCount}</Text>
              <Text style={styles.statLabel}>정답</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#FEE2E2' }]}>
              <Text style={styles.statNum}>{totalQuestions - correctCount}</Text>
              <Text style={styles.statLabel}>오답</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#DBEAFE' }]}>
              <Text style={styles.statNum}>{percentage}%</Text>
              <Text style={styles.statLabel}>정확도</Text>
            </View>
          </View>

          {/* 버튼 */}
          <TouchableOpacity style={styles.resultBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.resultBtnText}>홈으로 돌아가기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const currentQuiz = questions[currentIndex];
  const progress = ((currentIndex) / totalQuestions) * 100;

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
        <KanjiWord 
          text={currentQuiz.type === 'word' ? (currentQuiz.word || currentQuiz.question) : currentQuiz.question} 
          style={currentQuiz.type === 'word' ? [styles.questionText, { fontSize: 42, marginTop: 10 }] : styles.questionText} 
          onKanjiPress={setSelectedKanji} 
        />
      </View>

      {/* 힌트 영역 */}
      {!selectedOption && (
        <View style={styles.hintContainer}>
          {!showHint ? (
            <TouchableOpacity onPress={() => setShowHint(true)} style={styles.hintButton}>
              <Text style={styles.hintButtonText}>💡 힌트 보기</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.hintText}>
              {currentQuiz.type === 'word' ? currentQuiz.reading : currentQuiz.question_meaning}
            </Text>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.optionsContainer} showsVerticalScrollIndicator={false}>
        {currentQuiz.options.map((option) => {
          let btnStyle = [styles.optionButton];
          let textStyle = [styles.optionText];

          if (selectedOption) {
            if (option === currentQuiz.answer) {
              (btnStyle as any[]).push(styles.optionCorrect);
              (textStyle as any[]).push(styles.textCorrect);
            } else if (option === selectedOption) {
              (btnStyle as any[]).push(styles.optionIncorrect);
              (textStyle as any[]).push(styles.textIncorrect);
            } else {
              (btnStyle as any[]).push(styles.optionDisabled);
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
        {/* 모르겠어요 버튼 */}
        <TouchableOpacity
          style={[styles.optionButton, styles.skipButton, selectedOption !== null && styles.optionDisabled]}
          activeOpacity={0.7}
          onPress={() => handleSelectOption(null)}
          disabled={selectedOption !== null}
        >
          <Text style={[styles.optionText, styles.skipText]}>모르겠어요 (넘기기)</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Feedback & Next Button */}
      {selectedOption !== null && (
        <View style={[styles.feedbackContainer, isCorrect ? styles.feedbackCorrectBg : styles.feedbackIncorrectBg]}>
          <View style={{ marginBottom: 15 }}>
            <Text style={[styles.feedbackTitle, isCorrect ? styles.feedbackCorrectText : styles.feedbackIncorrectText]}>
              {selectedOption === 'SKIP' ? '정답을 확인하세요!' : (isCorrect ? '정답입니다! 🎉' : '아쉽네요! 💦')}
            </Text>
            
            <View style={styles.exampleContainer}>
              <View style={styles.wordInfoRow}>
                <KanjiWord text={currentQuiz.word || ""} style={{ color: '#059669', fontSize: 18, fontWeight: 'bold' }} onKanjiPress={setSelectedKanji} />
                <Text style={styles.wordInfoText}>
                  {currentQuiz.reading ? ` (${currentQuiz.reading})` : ''} : {currentQuiz.meaning}
                </Text>
                <TouchableOpacity onPress={() => Speech.speak(currentQuiz.word || currentQuiz.reading || '', { language: 'ja-JP' })} style={styles.speakerButtonSmall}>
                  <Ionicons name="volume-medium" size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
              {isCorrect && currentQuiz.example_sentence && (
                <View style={styles.exampleBox}>
                  <Text style={styles.exampleTitle}>💡 활용 예문</Text>
                  <KanjiWord text={currentQuiz.example_sentence} style={styles.exampleJp} onKanjiPress={setSelectedKanji} />
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
      <KanjiBottomSheet 
        visible={!!selectedKanji}
        character={selectedKanji || ''}
        onClose={() => setSelectedKanji(null)}
      />
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
  hintContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  hintButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  hintButtonText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  hintText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontStyle: 'italic',
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
  skipButton: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    marginTop: 8,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 15,
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
  wordInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  wordInfoText: {
    fontSize: 18,
    color: '#374151',
  },
  speakerButtonSmall: {
    marginLeft: 8,
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
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
  },

  /* ─── 결과 화면 ─── */
  resultContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
  },
  resultTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  resultSubtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
  },
  /* 원그래프 */
  pieWrapper: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  pieBase: {
    position: 'absolute',
  },
  pieSeg: {
    position: 'absolute',
    borderWidth: 22,
    borderColor: 'transparent',
    borderTopColor: '#3B82F6',
    borderRightColor: '#3B82F6',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  piePercent: {
    fontSize: 36,
    fontWeight: '800',
  },
  pieLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  gradeText: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 28,
  },
  /* 통계 카드 */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 36,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  resultBtn: {
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  resultBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
});
