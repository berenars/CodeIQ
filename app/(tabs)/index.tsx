import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, StatusBar, Animated } from 'react-native';
import { useState, useRef } from 'react';
import { Colors } from '@/constants/Colors';

const categories = [
  { id: 'math', name: 'Math', icon: '🔷' },
  { id: 'cs', name: 'CS', icon: '⚡' },
  { id: 'data', name: 'Data', icon: '📦' },
  { id: 'science', name: 'Science', icon: '🔬' },
];

const mathTopics = [
  { id: '1', title: 'Mathematical Thinking', progress: 0.3 },
  { id: '2', title: 'Proportional Reasoning', progress: 0 },
  { id: '3', title: 'Negative Numbers', progress: 0 },
  { id: '4', title: 'Solving Equations', progress: 0 },
  { id: '5', title: 'Visual Algebra', progress: 0 },
];

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [selectedCategory, setSelectedCategory] = useState('math');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleCategoryChange = (categoryId: string) => {
    if (categoryId === selectedCategory) return;
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
    
    setSelectedCategory(categoryId);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={styles.header}>
        <Text style={[styles.timeText, { color: colors.text }]}>9:41</Text>
      </View>

      <View style={[styles.categoryContainer, { borderBottomColor: colors.inputBorder }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={styles.categoryTab}
              onPress={() => handleCategoryChange(category.id)}
            >
              <View style={[
                styles.categoryIconContainer,
                { backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F0F4FF' }
              ]}>
                <Text style={styles.categoryIcon}>{category.icon}</Text>
              </View>
              <Text style={[
                styles.categoryText,
                { color: selectedCategory === category.id ? colors.text : colors.textSecondary }
              ]}>
                {category.name}
              </Text>
              {selectedCategory === category.id && (
                <View style={[styles.categoryUnderline, { backgroundColor: colors.primary }]} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Animated.ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Foundational Math</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Master problem solving essentials{'\n'}in math
            </Text>
          </View>

          <View style={styles.topicList}>
            {mathTopics.map((topic) => (
              <TouchableOpacity
                key={topic.id}
                style={[styles.topicCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
              >
                <View style={[styles.topicIconContainer, { backgroundColor: colorScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
                  <Text style={styles.topicIcon}>❓</Text>
                </View>
                <View style={styles.topicContent}>
                  <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
                  {topic.progress > 0 && (
                    <View style={styles.progressContainer}>
                      <View style={[styles.progressBar, { backgroundColor: colors.inputBorder }]}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              backgroundColor: colors.primary, 
                              width: `${topic.progress * 100}%`
                            }
                          ]} 
                        />
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  categoryContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  categoryScrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  categoryTab: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    position: 'relative',
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
    height: 3,
    borderRadius: 2,
  },
  categoryIcon: {
    fontSize: 28,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  sectionHeader: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  topicList: {
    gap: 12,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  topicIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  topicIcon: {
    fontSize: 32,
  },
  topicContent: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
});
