import React from 'react';
import { Text, TouchableOpacity, StyleSheet, View } from 'react-native';

interface Props {
  text: string;
  onKanjiPress: (kanji: string) => void;
  style?: any;
}

export default function KanjiWord({ text, onKanjiPress, style }: Props) {
  const chars = text.split('');
  const kanjiRegex = /[\u4E00-\u9FFF]/;

  return (
    <View style={styles.container}>
      {chars.map((char, index) => {
        if (kanjiRegex.test(char)) {
          return (
            <TouchableOpacity key={index} onPress={() => onKanjiPress(char)}>
              <Text style={[style, styles.kanji]}>{char}</Text>
            </TouchableOpacity>
          );
        }
        return <Text key={index} style={style}>{char}</Text>;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kanji: {
    color: '#3B82F6', // 파란색 액센트
    textDecorationLine: 'underline',
  }
});
