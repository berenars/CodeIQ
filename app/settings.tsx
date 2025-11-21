import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'automatic';

export default function SettingsScreen() {
  const { themeMode, setThemeMode, currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const [pressedOption, setPressedOption] = useState<ThemeMode | null>(null);

  const themeOptions: { mode: ThemeMode; icon: string; label: string; description: string }[] = [
    { mode: 'light', icon: 'sun.max.fill', label: 'Light', description: 'Always use light theme' },
    { mode: 'dark', icon: 'moon.fill', label: 'Dark', description: 'Always use dark theme' },
    { mode: 'automatic', icon: 'circle.lefthalf.filled', label: 'Automatic', description: 'Match system theme' },
  ];

  const handleThemeSelect = async (mode: ThemeMode) => {
    await setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.inputBorder }]}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol size={24} name="chevron.left" color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>APPEARANCE</Text>
          
          {themeOptions.map((option) => (
            <TouchableOpacity
              key={option.mode}
              style={[
                styles.settingCard,
                { 
                  backgroundColor: colors.inputBackground,
                  borderColor: themeMode === option.mode ? colors.primary : colors.inputBorder,
                  borderWidth: 2,
                },
                pressedOption === option.mode && styles.settingCardPressed
              ]}
              onPress={() => handleThemeSelect(option.mode)}
              onPressIn={() => setPressedOption(option.mode)}
              onPressOut={() => setPressedOption(null)}
              activeOpacity={1}
            >
              <View style={[styles.iconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
                <IconSymbol size={20} name={option.icon} color={themeMode === option.mode ? colors.primary : colors.text} />
              </View>
              <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{option.label}</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>
                  {option.description}
                </Text>
              </View>
              {themeMode === option.mode && (
                <IconSymbol size={20} name="checkmark.circle.fill" color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>GENERAL</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <View style={[styles.iconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="globe" color={colors.text} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Language</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>English</Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ABOUT</Text>
          
          <View style={[styles.settingCard, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
            <View style={[styles.iconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="info.circle.fill" color={colors.text} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Version</Text>
              <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>1.0.0</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 4,
  },
  settingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingCardPressed: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    elevation: 0,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
  },
});

