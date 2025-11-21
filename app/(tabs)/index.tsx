import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Animated, TouchableWithoutFeedback } from 'react-native';
import { useState, useRef, useEffect } from 'react';
import { router } from 'expo-router';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { IconSymbol } from '@/components/ui/icon-symbol';

const categories = [
  { id: 'computer_science', name: 'Computer\nScience', icon: 'cpu.fill' },
  { id: 'machine_learning', name: 'Machine\nLearning', icon: 'brain.head.profile' },
  { id: 'computer_engineering', name: 'Computer\nEngineering', icon: 'gear.badge' },
  { id: 'cybersecurity', name: 'Cyber-\nsecurity', icon: 'lock.shield.fill' },
];

const csTopics = [
  { 
    id: '1', 
    title: 'Algorithms & Data Structures',
    icon: 'arrow.triangle.branch',
    color: '#4CAF50',
    description: 'Classic CS logic problems — Big O, sorting, recursion, etc.\n\nExample questions:\n• "What\'s the time complexity of merge sort?"\n• "Which data structure uses FIFO?"'
  },
  { 
    id: '2', 
    title: 'Theory & Concepts',
    icon: 'book.fill',
    color: '#2196F3',
    description: 'Covers OS, DBMS, compilers, and general theory.\n\nExample questions:\n• "What is virtual memory?"\n• "ACID stands for?"'
  },
  { 
    id: '3', 
    title: 'Programming Logic',
    icon: 'chevron.left.forwardslash.chevron.right',
    color: '#FF9800',
    description: 'Code snippet interpretation / debugging questions.\n\nExample questions:\n• "What\'s the output of this Python code?"\n• "Find the bug in this snippet."'
  },
  { 
    id: '4', 
    title: 'CS Trivia',
    icon: 'star.fill',
    color: '#9C27B0',
    description: 'Fun general knowledge about CS history and breakthroughs.\n\nExample questions:\n• "Who developed the C language?"\n• "What year was the first microprocessor invented?"'
  },
];

const mlTopics = [
  { 
    id: '1', 
    title: 'Core Concepts',
    icon: 'brain.head.profile',
    color: '#E91E63',
    description: 'Basic understanding of models, training, data, etc.\n\nExample questions:\n• "What is overfitting?"\n• "What does gradient descent optimize?"'
  },
  { 
    id: '2', 
    title: 'Algorithms & Math',
    icon: 'function',
    color: '#3F51B5',
    description: 'Covers ML algorithms and the math behind them.\n\nExample questions:\n• "Which algorithm uses decision boundaries?"\n• "What\'s the derivative of the sigmoid function?"'
  },
  { 
    id: '3', 
    title: 'Applied ML',
    icon: 'camera.metering.multispot',
    color: '#FF5722',
    description: 'Real-world application and use-case logic.\n\nExample questions:\n• "Which model fits best for image classification?"\n• "What is transfer learning?"'
  },
  { 
    id: '4', 
    title: 'AI History & Tools',
    icon: 'hammer.fill',
    color: '#009688',
    description: 'Broader ML trivia + frameworks.\n\nExample questions:\n• "Who introduced CNNs?"\n• "What\'s TensorFlow primarily used for?"'
  },
];

const ceTopics = [
  { 
    id: '1', 
    title: 'Digital Logic & Circuits',
    icon: 'square.grid.3x3.square',
    color: '#00BCD4',
    description: 'Low-level gates, Boolean algebra, design.\n\nExample questions:\n• "What\'s the output of this logic circuit?"\n• "NAND is equivalent to?"'
  },
  { 
    id: '2', 
    title: 'Computer Architecture',
    icon: 'cpu',
    color: '#673AB7',
    description: 'CPU, memory, buses, pipelining, etc.\n\nExample questions:\n• "What is cache miss?"\n• "What\'s the function of ALU?"'
  },
  { 
    id: '3', 
    title: 'Embedded Systems',
    icon: 'memorychip',
    color: '#FF9800',
    description: 'Microcontrollers, sensors, system-level logic.\n\nExample questions:\n• "Which communication protocol is faster: I2C or SPI?"\n• "What does an interrupt do?"'
  },
  { 
    id: '4', 
    title: 'Hardware Trivia',
    icon: 'sparkles',
    color: '#795548',
    description: 'Milestones, chip names, historical knowledge.\n\nExample questions:\n• "What\'s the first commercially available microprocessor?"\n• "Who founded Intel?"'
  },
];

const securityTopics = [
  { 
    id: '1', 
    title: 'Network Security',
    icon: 'network',
    color: '#4CAF50',
    description: 'TCP/IP, firewalls, encryption basics.\n\nExample questions:\n• "Which port is used for HTTPS?"\n• "What does TLS stand for?"'
  },
  { 
    id: '2', 
    title: 'Ethical Hacking & Threats',
    icon: 'exclamationmark.shield.fill',
    color: '#F44336',
    description: 'Attack types, penetration testing.\n\nExample questions:\n• "What\'s a man-in-the-middle attack?"\n• "What\'s SQL injection?"'
  },
  { 
    id: '3', 
    title: 'Cryptography Basics',
    icon: 'key.fill',
    color: '#9C27B0',
    description: 'Hashing, symmetric/asymmetric encryption.\n\nExample questions:\n• "What\'s the difference between AES and RSA?"\n• "What\'s a one-way hash?"'
  },
  { 
    id: '4', 
    title: 'Cyber Awareness / Trivia',
    icon: 'lightbulb.fill',
    color: '#FF5722',
    description: 'Real-world security events, fun facts.\n\nExample questions:\n• "What year did WannaCry occur?"\n• "Who is Kevin Mitnick?"'
  },
];

export default function HomeScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const [selectedCategory, setSelectedCategory] = useState('computer_science');
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tooltipAnim = useRef(new Animated.Value(0)).current;
  const tooltipTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    setActiveTooltip(null); // Hide tooltip when switching categories
  };

  const handleInfoPress = (topicId: string) => {
    // Clear any existing timeout
    if (tooltipTimeout.current) {
      clearTimeout(tooltipTimeout.current);
    }

    // If clicking the same tooltip, hide it
    if (activeTooltip === topicId) {
      hideTooltip();
      return;
    }

    // Show new tooltip
    setActiveTooltip(topicId);
    
    // Animate in
    Animated.spring(tooltipAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 8,
    }).start();

    // Auto-hide after 5 seconds
    tooltipTimeout.current = setTimeout(() => {
      hideTooltip();
    }, 5000);
  };

  const hideTooltip = () => {
    Animated.timing(tooltipAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setActiveTooltip(null);
    });
  };

  const handleTopicPress = (topic: typeof csTopics[0]) => {
    // Navigate to offline game with topic info
    router.push({
      pathname: '/offline-game',
      params: {
        topicId: topic.id,
        category: selectedCategory,
        topicTitle: topic.title,
        topicColor: topic.color,
      },
    });
  };

  const getCurrentTopics = () => {
    switch (selectedCategory) {
      case 'computer_science':
        return csTopics;
      case 'machine_learning':
        return mlTopics;
      case 'computer_engineering':
        return ceTopics;
      case 'cybersecurity':
        return securityTopics;
      default:
        return [];
    }
  };

  const getCategoryTitle = () => {
    switch (selectedCategory) {
      case 'computer_science':
        return 'Computer Science';
      case 'machine_learning':
        return 'Machine Learning';
      case 'computer_engineering':
        return 'Computer Engineering';
      case 'cybersecurity':
        return 'Cybersecurity';
      default:
        return 'Topics';
    }
  };

  const getCategorySubtitle = () => {
    switch (selectedCategory) {
      case 'computer_science':
        return 'Master core CS concepts and\nproblem-solving skills';
      case 'machine_learning':
        return 'Learn AI, models, and ML\nalgorithms from basics to advanced';
      case 'computer_engineering':
        return 'Explore hardware, circuits,\nand embedded systems';
      case 'cybersecurity':
        return 'Master security, hacking,\nand cryptography fundamentals';
      default:
        return '';
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeout.current) {
        clearTimeout(tooltipTimeout.current);
      }
    };
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Spacer for top safe area */}
      <View style={{ height: 50 }} />

      <View style={[styles.categoryContainer, { borderBottomColor: colors.inputBorder }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          scrollEnabled={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          {categories.map((category) => {
            const isSelected = selectedCategory === category.id;
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  isSelected && {
                    backgroundColor: colors.primary,
                    borderRadius: 14,
                  }
                ]}
                onPress={() => handleCategoryChange(category.id)}
              >
                <View style={[
                  styles.categoryIconContainer,
                  { 
                    backgroundColor: isSelected 
                      ? 'rgba(255, 255, 255, 0.2)' 
                      : (currentScheme === 'dark' ? '#3A3A3A' : '#F0F4FF')
                  }
                ]}>
                  <IconSymbol 
                    size={24} 
                    name={category.icon as any} 
                    color={isSelected ? '#FFFFFF' : colors.text} 
                  />
                </View>
                <Text style={[
                  styles.categoryText,
                  { 
                    color: isSelected 
                      ? '#FFFFFF' 
                      : (selectedCategory === category.id ? colors.text : colors.textSecondary),
                    fontWeight: isSelected ? '700' : '600',
                    textAlign: 'center',
                  }
                ]}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Animated.ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: 110, paddingTop: 40 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        horizontal={false}
        bounces={true}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{getCategoryTitle()}</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              {getCategorySubtitle()}
            </Text>
          </View>

          <View style={styles.topicList}>
            {getCurrentTopics().map((topic, index) => (
              <View key={topic.id} style={styles.topicWrapper}>
                <TouchableOpacity
                  style={[styles.topicCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}
                  onPress={() => handleTopicPress(topic)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.topicIconContainer, { backgroundColor: topic.color + '20' }]}>
                    <IconSymbol size={28} name={topic.icon as any} color={topic.color} />
                  </View>
                  <View style={styles.topicContent}>
                    <Text style={[styles.topicTitle, { color: colors.text }]}>{topic.title}</Text>
                  </View>
                  <TouchableOpacity 
                    style={[styles.infoButton, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleInfoPress(topic.id);
                    }}
                  >
                    <IconSymbol size={18} name="info.circle.fill" color={colors.textSecondary} />
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* Tooltip */}
                {activeTooltip === topic.id && (
                  <>
                    {/* Dark backdrop to focus attention */}
                    <TouchableWithoutFeedback onPress={hideTooltip}>
                      <Animated.View 
                        style={[
                          styles.tooltipBackdrop,
                          {
                            opacity: tooltipAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [0, 0.6],
                            }),
                          }
                        ]} 
                      />
                    </TouchableWithoutFeedback>
                    
                    <Animated.View
                      style={[
                        styles.tooltip,
                        {
                          backgroundColor: colors.inputBackground,
                          borderColor: topic.color,
                          opacity: tooltipAnim,
                          // Adjust position for first items to prevent going off screen
                          bottom: index === 0 ? 50 : index === 1 ? 60 : 95,
                          transform: [
                            {
                              translateY: tooltipAnim.interpolate({
                                inputRange: [0, 1],
                                outputRange: [10, 0],
                              }),
                            },
                            {
                              scale: tooltipAnim,
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={styles.tooltipHeader}>
                        <View style={[styles.tooltipIconContainer, { backgroundColor: topic.color + '20' }]}>
                          <IconSymbol size={18} name={topic.icon as any} color={topic.color} />
                        </View>
                        <Text style={[styles.tooltipTitle, { color: colors.text }]}>{topic.title}</Text>
                        <TouchableOpacity onPress={hideTooltip} style={styles.tooltipClose}>
                          <IconSymbol size={14} name="xmark" color={colors.textSecondary} />
                        </TouchableOpacity>
                      </View>
                      <Text style={[styles.tooltipDescription, { color: colors.textSecondary }]}>
                        {topic.description}
                      </Text>
                    </Animated.View>
                  </>
                )}
              </View>
            ))}
          </View>

          {getCurrentTopics().length === 0 && (
            <View style={styles.comingSoonContainer}>
              <Text style={[styles.comingSoonText, { color: colors.textSecondary }]}>
                Coming Soon
              </Text>
            </View>
          )}
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
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    justifyContent: 'space-evenly',
    flexDirection: 'row',
    width: '100%',
  },
  categoryTab: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    flex: 1,
    maxWidth: 90,
    position: 'relative',
  },
  categoryIconContainer: {
    width: 46,
    height: 46,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIcon: {
    fontSize: 24,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    marginBottom: 16,
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
  topicWrapper: {
    position: 'relative',
    overflow: 'visible',
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
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  comingSoonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tooltipBackdrop: {
    position: 'absolute',
    top: -1000,
    bottom: -1000,
    left: -1000,
    right: -1000,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 999,
  },
  tooltip: {
    position: 'absolute',
    bottom: 95,
    left: 0,
    right: 0,
    marginHorizontal: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000,
  },
  tooltipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  tooltipIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  tooltipClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipDescription: {
    fontSize: 12,
    lineHeight: 17,
  },
});
