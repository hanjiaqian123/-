import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { searchCities } from '../../services/citySearchApi';
import type { CitySearchResult } from '../../types/models';

type CitySearchProps = {
  visible: boolean;
  onClose: () => void;
  onSelectCity: (city: CitySearchResult) => void;
};

export default function CitySearch({
  visible,
  onClose,
  onSelectCity,
}: CitySearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CitySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const searchInFlight = useRef(false);

  async function runSearch() {
    const keyword = query.trim();
    if (!keyword) {
      setSearchError('请输入城市名称');
      return;
    }

    if (searchInFlight.current) {
      return;
    }

    searchInFlight.current = true;
    setIsSearching(true);
    setSearchError(null);
    setHasSearched(true);

    try {
      const cities = await searchCities(keyword);
      setResults(cities);
    } catch (error) {
      console.error('城市搜索失败：', error);
      setResults([]);
      setSearchError(
        error instanceof Error
          ? error.message
          : '城市搜索失败，请检查网络后重试'
      );
    } finally {
      searchInFlight.current = false;
      setIsSearching(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>CHANGE CITY</Text>
            <Text style={styles.title}>搜索城市</Text>
          </View>
          <Pressable
            accessibilityLabel="关闭城市搜索"
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.closeButtonText}>关闭</Text>
          </Pressable>
        </View>

        <View style={styles.searchRow}>
          <TextInput
            accessibilityLabel="输入城市名称"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setQuery(value);
              setResults([]);
              setSearchError(null);
              setHasSearched(false);
            }}
            onSubmitEditing={() => void runSearch()}
            placeholder="输入城市，如：北京、上海"
            placeholderTextColor="#98A6B3"
            returnKeyType="search"
            style={styles.input}
            value={query}
          />
          <Pressable
            accessibilityLabel="搜索城市"
            accessibilityRole="button"
            disabled={isSearching}
            onPress={() => void runSearch()}
            style={({ pressed }) => [
              styles.searchButton,
              isSearching && styles.searchButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSearching ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.searchButtonText}>搜索</Text>
            )}
          </Pressable>
        </View>

        {searchError ? (
          <View style={styles.messageCard}>
            <Text style={styles.errorText}>{searchError}</Text>
          </View>
        ) : null}

        {!isSearching && hasSearched && !searchError && results.length === 0 ? (
          <View style={styles.messageCard}>
            <Text style={styles.emptyTitle}>没有找到相关城市</Text>
            <Text style={styles.emptyText}>
              请尝试输入更完整的城市名称或更换关键词。
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.results}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {results.map((city) => {
            const locationLabel = [city.admin1, city.country]
              .filter(Boolean)
              .join(' · ');

            return (
              <Pressable
                accessibilityLabel={`选择${city.name}，${locationLabel}`}
                accessibilityRole="button"
                key={city.id}
                onPress={() => onSelectCity(city)}
                style={({ pressed }) => [
                  styles.resultCard,
                  pressed && styles.resultCardPressed,
                ]}
              >
                <View style={styles.locationIcon}>
                  <Text style={styles.locationIconText}>⌖</Text>
                </View>
                <View style={styles.resultCopy}>
                  <Text style={styles.cityName}>{city.name}</Text>
                  <Text style={styles.locationText}>{locationLabel}</Text>
                </View>
                <Text style={styles.selectArrow}>›</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F3F6FA',
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  eyebrow: {
    color: '#6AA5C9',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 2,
  },
  title: {
    color: '#18324B',
    fontSize: 26,
    fontWeight: '800',
    marginTop: 5,
  },
  closeButton: {
    backgroundColor: '#E1E8EE',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  closeButtonText: {
    color: '#41566B',
    fontSize: 13,
    fontWeight: '700',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 24,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D9E3EA',
    borderRadius: 16,
    borderWidth: 1,
    color: '#18324B',
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  searchButton: {
    alignItems: 'center',
    backgroundColor: '#234968',
    borderRadius: 16,
    justifyContent: 'center',
    minWidth: 70,
    paddingHorizontal: 16,
  },
  searchButtonDisabled: {
    opacity: 0.65,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  messageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginTop: 16,
    padding: 16,
  },
  errorText: {
    color: '#A3332A',
    fontSize: 13,
    lineHeight: 20,
  },
  emptyTitle: {
    color: '#41566B',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: '#8293A5',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 5,
  },
  results: {
    gap: 10,
    paddingBottom: 30,
    paddingTop: 18,
  },
  resultCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    flexDirection: 'row',
    padding: 15,
  },
  resultCardPressed: {
    backgroundColor: '#EAF4FA',
  },
  locationIcon: {
    alignItems: 'center',
    backgroundColor: '#E1EFF7',
    borderRadius: 13,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  locationIconText: {
    color: '#315D7B',
    fontSize: 22,
    fontWeight: '700',
  },
  resultCopy: {
    flex: 1,
    marginLeft: 12,
  },
  cityName: {
    color: '#18324B',
    fontSize: 16,
    fontWeight: '800',
  },
  locationText: {
    color: '#8293A5',
    fontSize: 12,
    marginTop: 5,
  },
  selectArrow: {
    color: '#8293A5',
    fontSize: 26,
  },
  pressed: {
    opacity: 0.72,
  },
});
