import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useAuthStore } from '../store/authStore';
import { fetchVocabularyDays, searchVocabulary, JlptWord, DayGroup } from '../utils/api';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import KanjiWord from '../components/KanjiWord';
import KanjiBottomSheet from '../components/KanjiBottomSheet';

const { width } = Dimensions.get('window');

type VocabularyScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Vocabulary'>;

type Props = {
  navigation: VocabularyScreenNavigationProp;
  route: { params?: { initialLevel?: string } };
};

// JLPT 레벨 목록
const LEVELS = ['N5', 'N4', 'N3', 'N2', 'N1'];

// 레벨별 그라디언트 색상
const LEVEL_COLORS: Record<string, [string, string]> = {
  N5: ['#10B981', '#34D399'],
  N4: ['#3B82F6', '#60A5FA'],
  N3: ['#8B5CF6', '#A78BFA'],
  N2: ['#F59E0B', '#FBBF24'],
  N1: ['#EF4444', '#F87171'],
};

// 단어 카드 컴포넌트 (확장/접기 토글)
function WordCard({ word, onKanjiPress }: { word: JlptWord; onKanjiPress: (char: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animatedHeight, {
      toValue,
      useNativeDriver: false,
      friction: 8,
      tension: 80,
    }).start();
    setExpanded(!expanded);
  }, [expanded, animatedHeight]);

  // 확장 영역 높이 보간
  const expandHeight = animatedHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 80],
  });

  const expandOpacity = animatedHeight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });

  const speakWord = () => {
    Speech.speak(word.word || word.reading, { language: 'ja-JP' });
  };

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={toggleExpand}>
      <View style={styles.wordCard}>
        <View style={styles.wordRow}>
          {/* 한자 (큰 글씨) 및 발음 버튼 */}
          <View style={styles.wordLeft}>
            <KanjiWord text={word.word} style={styles.kanjiText} onKanjiPress={onKanjiPress} />
            <TouchableOpacity onPress={speakWord} style={styles.speakerButton}>
              <Ionicons name="volume-medium" size={24} color="#3B82F6" />
            </TouchableOpacity>
          </View>

          {/* 읽기 + 뜻 */}
          <View style={styles.wordRight}>
            <Text style={styles.readingText}>{word.reading}</Text>
            <Text style={styles.meaningText} numberOfLines={expanded ? undefined : 1}>
              {word.meaning}
            </Text>
          </View>

          {/* 확장 화살표 */}
          <Text style={styles.expandArrow}>{expanded ? '▲' : '▼'}</Text>
        </View>

        {/* 확장 시 상세 정보 */}
        <Animated.View style={[styles.expandedContent, { height: expandHeight, opacity: expandOpacity }]}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>읽기</Text>
              <Text style={styles.detailValue}>{word.reading}</Text>
            </View>
            <View style={styles.detailDivider} />
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>뜻</Text>
              <Text style={styles.detailValue}>{word.meaning}</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function VocabularyScreen({ navigation, route }: Props) {
  const { token } = useAuthStore();
  const [selectedLevel, setSelectedLevel] = useState(route.params?.initialLevel || 'N5');
  const [dayGroups, setDayGroups] = useState<DayGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<JlptWord[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);

  // Day별 단어 데이터 로드
  useEffect(() => {
    loadDayGroups();
  }, [selectedLevel]);

  const loadDayGroups = async () => {
    setIsLoading(true);
    setSearchResults(null);
    setSearchQuery('');
    const data = await fetchVocabularyDays(token, selectedLevel);
    setDayGroups(data);
    setIsLoading(false);
  };

  // 검색 디바운스 처리
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setSearchResults(null);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      const results = await searchVocabulary(token, query);
      setSearchResults(results);
    }, 400);
  }, [token]);

  // SectionList용 데이터 변환
  const sections = searchResults
    ? [{ title: `검색 결과 (${searchResults.length}건)`, data: searchResults }]
    : dayGroups.map(group => ({
        title: group.day,
        data: group.words,
      }));

  // 섹션 헤더 렌더링
  const renderSectionHeader = ({ section }: { section: { title: string; data: JlptWord[] } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <View style={[styles.sectionDot, { backgroundColor: LEVEL_COLORS[selectedLevel]?.[0] || '#3B82F6' }]} />
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <Text style={styles.sectionCount}>{section.data.length}개</Text>
    </View>
  );

  // 단어 아이템 렌더링
  const renderItem = ({ item }: { item: JlptWord }) => <WordCard word={item} onKanjiPress={(char) => setSelectedKanji(char)} />;

  // 빈 상태 렌더링
  const renderEmpty = () => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyText}>
          {searchQuery ? '검색 결과가 없습니다.' : '단어 데이터가 없습니다.'}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* 배경 */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#F9FAFB' }]} />
      <View style={[styles.bgCircle, { top: -80, right: -60, backgroundColor: '#DBEAFE' }]} />
      <View style={[styles.bgCircle, { top: 300, left: -120, backgroundColor: '#EDE9FE' }]} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* 레벨 탭 */}
        <View style={styles.levelTabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.levelTabScroll}
          >
            {LEVELS.map((level) => {
              const isSelected = selectedLevel === level;
              const colors = LEVEL_COLORS[level];
              return (
                <TouchableOpacity
                  key={level}
                  activeOpacity={0.7}
                  onPress={() => setSelectedLevel(level)}
                >
                  {isSelected ? (
                    <LinearGradient colors={colors} style={[styles.levelTab, styles.levelTabActive]}>
                      <Text style={[styles.levelTabText, styles.levelTabTextActive]}>{level}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.levelTab}>
                      <Text style={styles.levelTabText}>{level}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* 검색바 */}
        <View style={styles.searchContainer}>
          <BlurView intensity={80} tint="light" style={styles.searchBlur}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="일본어 또는 한국어로 검색..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={handleSearch}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </BlurView>
        </View>

        {/* 로딩 표시 */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>단어를 불러오는 중...</Text>
          </View>
        ) : (
          /* 단어 리스트 (SectionList) */
          <SectionList
            sections={sections}
            keyExtractor={(item) => `${item.id}`}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            stickySectionHeadersEnabled={true}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={5}
          />
        )}
        <KanjiBottomSheet 
          visible={!!selectedKanji} 
          character={selectedKanji || ''} 
          onClose={() => setSelectedKanji(null)} 
        />
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
  },

  // 레벨 탭
  levelTabContainer: {
    paddingTop: Platform.OS === 'ios' ? 50 : 10,
  },
  levelTabScroll: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },
  levelTab: {
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: { elevation: 1 },
    }),
  },
  levelTabActive: {
    borderWidth: 0,
  },
  levelTabText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#6B7280',
  },
  levelTabTextActive: {
    color: '#FFFFFF',
  },

  // 검색바
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBlur: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    paddingVertical: 0,
  },

  // 리스트 콘텐츠
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },

  // 섹션 헤더 (Day별)
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(249, 250, 251, 0.95)',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },

  // 단어 카드
  wordCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.03,
        shadowRadius: 12,
      },
      android: { elevation: 1 },
    }),
  },
  wordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  speakerButton: {
    padding: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 20,
    marginLeft: 8,
  },
  wordLeft: {
    minWidth: 70,
    marginRight: 14,
  },
  kanjiText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  wordRight: {
    flex: 1,
  },
  readingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 3,
  },
  meaningText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    lineHeight: 20,
  },
  expandArrow: {
    fontSize: 10,
    color: '#9CA3AF',
    marginLeft: 8,
  },

  // 확장 상세 영역
  expandedContent: {
    overflow: 'hidden',
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },

  // 로딩
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },

  // 빈 상태
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#9CA3AF',
  },
});
