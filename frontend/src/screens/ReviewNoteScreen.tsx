import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, SectionList, Switch } from 'react-native';
import { fetchQuizHistory, HistoryLogDto } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { LinearGradient } from 'expo-linear-gradient';

type ReviewNoteScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReviewNote'>;

type Props = {
  navigation: ReviewNoteScreenNavigationProp;
};

// 주차 계산 헬퍼 함수
const getWeekOfMonth = (dateString: string) => {
  const date = new Date(dateString);
  return Math.ceil(date.getDate() / 7);
};

export default function ReviewNoteScreen({ navigation }: Props) {
  const { token } = useAuthStore();
  
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [selectedWeek, setSelectedWeek] = useState<number>(0); // 0 = 전체보기, 1~5주차
  const [incorrectOnly, setIncorrectOnly] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const [historyLogs, setHistoryLogs] = useState<HistoryLogDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadHistory();
  }, [year, month]);

  const loadHistory = async () => {
    setIsLoading(true);
    const logs = await fetchQuizHistory(token, year, month);
    setHistoryLogs(logs);
    setIsLoading(false);
  };

  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(y => y - 1);
      setMonth(12);
    } else {
      setMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(y => y + 1);
      setMonth(1);
    } else {
      setMonth(m => m + 1);
    }
  };

  // 데이터 가공 로직
  const groupedData = useMemo(() => {
    let filtered = historyLogs;

    // 1. 오답 필터링
    if (incorrectOnly) {
      filtered = filtered.filter(log => !log.isCorrect);
    }

    // 2. 주차 필터링
    if (selectedWeek > 0) {
      filtered = filtered.filter(log => getWeekOfMonth(log.answeredAt) === selectedWeek);
    }

    // 3. n일차(dayStudied) 기준으로 그룹핑
    const groups: { [key: number]: HistoryLogDto[] } = {};
    filtered.forEach(log => {
      const day = log.dayStudied;
      if (!groups[day]) groups[day] = [];
      groups[day].push(log);
    });

    // 4. SectionList 데이터 포맷으로 변환 (최근 일차 순으로 정렬)
    const sections = Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map(day => {
        // 해당 일차의 가장 최신 로그에서 날짜 가져오기
        const sampleDate = new Date(groups[day][0].answeredAt);
        const dateStr = `${sampleDate.getMonth() + 1}.${sampleDate.getDate()}`;
        return {
          title: `Day ${day} (${dateStr})`,
          data: groups[day],
        };
      });

    return sections;
  }, [historyLogs, incorrectOnly, selectedWeek]);

  const renderLogItem = ({ item }: { item: HistoryLogDto }) => {
    const isExpanded = expandedLogId === item.logId;
    return (
      <TouchableOpacity 
        style={[styles.card, !item.isCorrect && styles.cardIncorrect]}
        activeOpacity={0.7}
        onPress={() => setExpandedLogId(isExpanded ? null : item.logId)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardWord}>{item.word}</Text>
          <View style={[styles.badge, item.isCorrect ? styles.badgeCorrect : styles.badgeIncorrect]}>
            <Text style={item.isCorrect ? styles.badgeCorrectText : styles.badgeIncorrectText}>
              {item.isCorrect ? 'O' : 'X'}
            </Text>
          </View>
        </View>
        <Text style={styles.cardQuestion} numberOfLines={isExpanded ? 0 : 1}>{item.question}</Text>

        {isExpanded && (
          <View style={styles.expandedArea}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>정답</Text>
              <Text style={styles.infoTextCorrect}>{item.answer}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>뜻</Text>
              <Text style={styles.infoText}>{item.meaning}</Text>
            </View>
            {item.exampleSentence && (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>💡 활용 예문</Text>
                <Text style={styles.exampleJp}>{item.exampleSentence}</Text>
                <Text style={styles.exampleKo}>{item.exampleMeaning}</Text>
              </View>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Month Navigation */}
      <View style={styles.monthSelector}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>⬅️</Text>
        </TouchableOpacity>
        <Text style={styles.monthText}>{year}년 {month}월</Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
          <Text style={styles.arrowText}>➡️</Text>
        </TouchableOpacity>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekSelector}>
        {['전체', '1주차', '2주차', '3주차', '4주차', '5주차'].map((label, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[styles.weekTab, selectedWeek === idx && styles.weekTabActive]}
            onPress={() => setSelectedWeek(idx)}
          >
            <Text style={[styles.weekTabText, selectedWeek === idx && styles.weekTabTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Toggle */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterText}>오답만 보기</Text>
        <Switch
          value={incorrectOnly}
          onValueChange={setIncorrectOnly}
          trackColor={{ false: "#D1D5DB", true: "#FECACA" }}
          thumbColor={incorrectOnly ? "#EF4444" : "#F9FAFB"}
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : groupedData.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>학습 기록이 없습니다.</Text>
        </View>
      ) : (
        <SectionList
          sections={groupedData}
          keyExtractor={(item) => item.logId.toString()}
          renderItem={renderLogItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeader}>
              <LinearGradient colors={['#3B82F6', '#60A5FA']} style={styles.sectionBadge}>
                <Text style={styles.sectionTitle}>{title}</Text>
              </LinearGradient>
            </View>
          )}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    gap: 30,
  },
  arrowBtn: {
    padding: 10,
  },
  arrowText: {
    fontSize: 20,
  },
  monthText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  weekSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  weekTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  weekTabActive: {
    backgroundColor: '#111827',
  },
  weekTabText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  weekTabTextActive: {
    color: '#FFFFFF',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  filterText: {
    color: '#4B5563',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  sectionBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardIncorrect: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardWord: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCorrect: {
    backgroundColor: '#D1FAE5',
  },
  badgeIncorrect: {
    backgroundColor: '#FEE2E2',
  },
  badgeCorrectText: {
    color: '#059669',
    fontWeight: '900',
  },
  badgeIncorrectText: {
    color: '#DC2626',
    fontWeight: '900',
  },
  cardQuestion: {
    color: '#4B5563',
    fontSize: 15,
    lineHeight: 22,
  },
  expandedArea: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 40,
    color: '#6B7280',
    fontWeight: '700',
  },
  infoText: {
    flex: 1,
    color: '#111827',
    fontWeight: '600',
  },
  infoTextCorrect: {
    flex: 1,
    color: '#059669',
    fontWeight: '800',
  },
  exampleBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
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
});
