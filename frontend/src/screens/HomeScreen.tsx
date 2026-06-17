import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Dimensions, Platform } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

type Props = {
  navigation: HomeScreenNavigationProp;
};

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuthStore();

  return (
    <View style={styles.container}>
      {/* 깔끔하고 밝은 토스/인스타 스타일 배경 */}
      <View style={StyleSheet.absoluteFillObject} backgroundColor="#F9FAFB" />
      
      {/* 은은한 파스텔톤 배경 장식 (글래스모피즘 효과 극대화) */}
      <View style={[styles.bgCircle, { top: -50, left: -50, backgroundColor: '#DBEAFE' }]} />
      <View style={[styles.bgCircle, { top: 200, right: -100, backgroundColor: '#EDE9FE' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.greeting}>환영합니다, {user?.nickname}님!</Text>
            <Text style={styles.title}>오늘도 힘차게 🚀</Text>
            
            <View style={styles.streakBadge}>
              <Text style={styles.streakIcon}>🔥</Text>
              <Text style={styles.streakText}>{user?.daysStudied || 1}일째 학습 중</Text>
            </View>
          </View>

          {/* Cards Section */}
          <View style={styles.cardsContainer}>
            
            {/* Word Quiz Card */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Quiz', { initialDifficulty: user?.difficulty, mode: 'normal' })}>
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>일일 단어 퀴즈</Text>
                  <LinearGradient colors={['#3B82F6', '#60A5FA']} style={styles.tag}>
                    <Text style={styles.tagText}>새로운 단어</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.cardDesc}>
                  망각 곡선에 맞춘 똑똑한 복습 시스템
                </Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <LinearGradient
                      colors={['#10B981', '#34D399']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressFill, { width: '30%' }]}
                    />
                  </View>
                  <Text style={styles.progressText}>3 / 10 완료</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* AI Chat Card */}
            <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Chat')}>
              <BlurView intensity={80} tint="light" style={styles.glassCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>실시간 AI 회화</Text>
                  <LinearGradient colors={['#8B5CF6', '#A78BFA']} style={styles.tag}>
                    <Text style={styles.tagText}>롤플레잉</Text>
                  </LinearGradient>
                </View>
                <Text style={styles.cardDesc}>
                  원어민처럼 자연스럽게 대화해보세요.
                </Text>
                <View style={styles.actionButton}>
                  <Text style={styles.actionButtonText}>대화 시작하기</Text>
                </View>
              </BlurView>
            </TouchableOpacity>

            {/* Review Section */}
            <BlurView intensity={80} tint="light" style={[styles.glassCard, { marginTop: 10 }]}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>복습 노트</Text>
                <View style={styles.iconTag}>
                  <Text style={{ fontSize: 16 }}>📓</Text>
                </View>
              </View>
              <Text style={styles.cardDesc}>
                과거의 실수를 반복하지 마세요!
              </Text>
              
              <View style={{ gap: 10 }}>
                <TouchableOpacity 
                  style={styles.reviewButton}
                  onPress={() => navigation.navigate('Quiz', { mode: 'review_incorrect' })}
                >
                  <Text style={styles.reviewButtonText}>❌ 틀린 문제 다시보기</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.reviewButton, { backgroundColor: '#F3F4F6', borderWidth: 0 }]}
                  onPress={() => navigation.navigate('Quiz', { mode: 'review_today' })}
                >
                  <Text style={[styles.reviewButtonText, { color: '#4B5563' }]}>📅 오늘 푼 문제 복습하기</Text>
                </TouchableOpacity>
              </View>
            </BlurView>

          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  bgCircle: {
    position: 'absolute',
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    opacity: 0.8,
    // Android에서는 blur 필터가 적용되지 않을 수 있어 opacity와 색상 조합으로 커버
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  greeting: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  streakIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  streakText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  cardsContainer: {
    gap: 20,
  },
  glassCard: {
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.03,
        shadowRadius: 20,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  iconTag: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 12,
  },
  tagText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  cardDesc: {
    color: '#6B7280',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 20,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 4,
  },
  progressBarBg: {
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
    color: '#9CA3AF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 8,
  },
  actionButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
  },
  wordChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipText: {
    color: '#374151',
    fontWeight: '700',
    fontSize: 14,
  },
  reviewButton: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  reviewButtonText: {
    color: '#B91C1C',
    fontWeight: '700',
    fontSize: 15,
  }
});
