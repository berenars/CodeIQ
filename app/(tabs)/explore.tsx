import { View, Text, StyleSheet, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { SvgAvatar } from '@/components/SvgAvatar';
import { DEFAULT_AVATAR } from '@/constants/avatars';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function OnlineScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user } = useAuth();

  // Get username and avatar from user metadata (real-time synced)
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const currentAvatar = user?.user_metadata?.avatar || DEFAULT_AVATAR;

  const handleCreateLobby = () => {
    router.push('/create-lobby');
  };

  const handleJoinLobby = () => {
    router.push('/join-lobby');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* Spacer for top safe area */}
        <View style={{ height: 50 }} />

        <View style={styles.contentInner}>
          {/* User Avatar and Name */}
          <View style={styles.userSection}>
            <SvgAvatar svgString={currentAvatar} size={100} />
            <Text style={[styles.username, { color: colors.text }]}>{username}</Text>
          </View>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Play quiz games with friends in real-time
          </Text>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {/* Create Lobby Button */}
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: colors.primary }]}
              onPress={handleCreateLobby}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}>
                <IconSymbol size={40} name="plus.circle.fill" color="#FFFFFF" />
              </View>
              <Text style={styles.actionTitle}>Create Lobby</Text>
              <Text style={styles.actionSubtitle}>Host a game and invite friends</Text>
            </TouchableOpacity>

            {/* Join Lobby Button */}
            <TouchableOpacity 
              style={[styles.actionCard, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F0F4FF', borderWidth: 2, borderColor: colors.primary }]}
              onPress={handleJoinLobby}
              activeOpacity={0.8}
            >
              <View style={[styles.iconContainer, { backgroundColor: currentScheme === 'dark' ? 'rgba(106, 153, 78, 0.2)' : 'rgba(106, 153, 78, 0.1)' }]}>
                <IconSymbol size={40} name="person.2.fill" color={colors.primary} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>Join Lobby</Text>
              <Text style={[styles.actionSubtitle, { color: colors.textSecondary }]}>Enter a PIN to join a game</Text>
            </TouchableOpacity>
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 110,
  },
  contentInner: {
    flex: 1,
    alignItems: 'center',
  },
  userSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  username: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 40,
  },
  actionsContainer: {
    width: '100%',
    gap: 16,
  },
  actionCard: {
    width: '100%',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  actionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});
