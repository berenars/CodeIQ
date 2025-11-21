import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Platform, DevSettings, TextInput, Modal, FlatList } from 'react-native';
import { Colors } from '@/constants/Colors';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { CustomAlert } from '@/components/CustomAlert';
import { supabase } from '@/lib/supabase';
import { SvgAvatar } from '@/components/SvgAvatar';
import { AVATAR_OPTIONS, DEFAULT_AVATAR } from '@/constants/avatars';
import { useTheme } from '@/contexts/ThemeContext';
import { getFeaturedAchievement, subscribeToAchievements } from '@/lib/offline';
import type { UserAchievement } from '@/types/offline';

export default function YouScreen() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  const { user, signOut, refreshUser } = useAuth();
  const [alertVisible, setAlertVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [featuredAchievement, setFeaturedAchievement] = useState<UserAchievement | null>(null);

  // Get username and avatar from user metadata
  const username = user?.user_metadata?.username || user?.email?.split('@')[0] || 'User';
  const currentAvatar = user?.user_metadata?.avatar || DEFAULT_AVATAR;

  // Load featured achievement
  useEffect(() => {
    loadFeaturedAchievement();
    if (user) {
      const achievementSub = subscribeToAchievements(user.id, () => {
        // Reload featured achievement when new ones are earned
        loadFeaturedAchievement();
      });
      return () => {
        achievementSub.unsubscribe();
      };
    }
  }, [user?.id]);

  const loadFeaturedAchievement = async () => {
    try {
      const achievement = await getFeaturedAchievement();
      setFeaturedAchievement(achievement);
    } catch (error) {
      console.error('Error loading featured achievement:', error);
    }
  };

  const getTierColor = (tier: string) => {
    const tierColors = {
      bronze: '#CD7F32',
      silver: '#C0C0C0',
      gold: '#FFD700',
      platinum: '#E5E4E2',
    };
    return tierColors[tier as keyof typeof tierColors] || '#6B7280';
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'ios') {
      // Use native alert on iOS
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]
      );
    } else {
      // Use custom alert on Android and Web
      setAlertVisible(true);
    }
  };

  const performSignOut = async () => {
    try {
      // Clear the session first
      await signOut();
      
      // Small delay to ensure everything is cleared
      setTimeout(() => {
        if (Platform.OS === 'web') {
          // Web: Hard reload (exactly like F5) - bypasses cache
          if (typeof window !== 'undefined') {
            // Use href assignment for true hard reload
            window.location.href = window.location.origin;
          }
        } else if (__DEV__) {
          // iOS/Android in development: Use DevSettings.reload() - same as pressing "r"!
          DevSettings.reload();
        } else {
          // iOS/Android in production: Navigate normally
          router.replace('/');
        }
      }, 200);
    } catch (error) {
      console.error('Error during sign out:', error);
      // Still try to reload/navigate
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = window.location.origin;
      } else if (__DEV__) {
        DevSettings.reload();
      } else {
        router.replace('/');
      }
    }
  };

  const handleEditUsername = () => {
    setNewUsername(username);
    setEditModalVisible(true);
  };

  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      if (Platform.OS === 'ios') {
        Alert.alert('Error', 'Username cannot be empty');
      } else {
        Alert.alert('Error', 'Username cannot be empty');
      }
      return;
    }

    if (newUsername.trim() === username) {
      setEditModalVisible(false);
      return;
    }

    // Check if user is still authenticated
    if (!user) {
      if (Platform.OS === 'ios') {
        Alert.alert('Error', 'Please sign in to change your username');
      } else {
        Alert.alert('Error', 'Please sign in to change your username');
      }
      setEditModalVisible(false);
      return;
    }

    setIsUpdating(true);

    try {
      // Verify session is valid before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Auth session missing! Please sign in again.');
      }

      const { data, error } = await supabase.auth.updateUser({
        data: { username: newUsername.trim() }
      });

      if (error) throw error;

      // Close modal - no popup needed
      setEditModalVisible(false);
      
      // Refresh user data across all devices
      await refreshUser();
    } catch (error: any) {
      console.error('Error updating username:', error);
      if (Platform.OS === 'ios') {
        Alert.alert('Error', error.message || 'Failed to update username');
      } else {
        Alert.alert('Error', error.message || 'Failed to update username');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSelectAvatar = async (avatarSvg: string) => {
    // Check if user is still authenticated
    if (!user) {
      if (Platform.OS === 'ios') {
        Alert.alert('Error', 'Please sign in to change your avatar');
      } else {
        Alert.alert('Error', 'Please sign in to change your avatar');
      }
      setAvatarModalVisible(false);
      return;
    }

    setIsUpdating(true);

    try {
      // Verify session is valid before updating
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Auth session missing! Please sign in again.');
      }

      const { data, error } = await supabase.auth.updateUser({
        data: { avatar: avatarSvg }
      });

      if (error) throw error;

      // Close modal - no popup needed
      setAvatarModalVisible(false);
      
      // Refresh user data across all devices
      await refreshUser();
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      if (Platform.OS === 'ios') {
        Alert.alert('Error', error.message || 'Failed to update avatar');
      } else {
        Alert.alert('Error', error.message || 'Failed to update avatar');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={currentScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* Custom Alert for Android/Web */}
      <CustomAlert
        visible={alertVisible}
        title="Sign Out"
        message="Are you sure you want to sign out?"
        buttons={[
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setAlertVisible(false),
          },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: performSignOut,
          },
        ]}
        onDismiss={() => setAlertVisible(false)}
      />

      {/* Edit Username Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Username</Text>
            
            <TextInput
              style={[styles.modalInput, { 
                color: colors.text, 
                borderColor: colors.inputBorder,
                backgroundColor: currentScheme === 'dark' ? '#2A2A2A' : '#FFFFFF'
              }]}
              value={newUsername}
              onChangeText={setNewUsername}
              placeholder="Enter new username"
              placeholderTextColor={colors.textSecondary}
              autoFocus={true}
              editable={!isUpdating}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { backgroundColor: colors.inputBorder },
                  pressedButton === 'cancel' && styles.modalButtonPressed
                ]}
                onPress={() => setEditModalVisible(false)}
                onPressIn={() => setPressedButton('cancel')}
                onPressOut={() => setPressedButton(null)}
                disabled={isUpdating}
                activeOpacity={1}
              >
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton, 
                  { backgroundColor: colors.primary, shadowColor: colors.primary },
                  pressedButton === 'save' && styles.modalButtonPressed
                ]}
                onPress={handleUpdateUsername}
                onPressIn={() => setPressedButton('save')}
                onPressOut={() => setPressedButton(null)}
                disabled={isUpdating}
                activeOpacity={1}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  {isUpdating ? 'Updating...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Avatar Selection Modal */}
      <Modal
        visible={avatarModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAvatarModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.avatarModalContent, { backgroundColor: colors.inputBackground }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Avatar</Text>
            
            <FlatList
              data={AVATAR_OPTIONS}
              numColumns={3}
              keyExtractor={(item, index) => index.toString()}
              contentContainerStyle={styles.avatarGrid}
              columnWrapperStyle={styles.avatarRow}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  style={styles.avatarOption}
                  onPress={() => handleSelectAvatar(item)}
                  disabled={isUpdating}
                >
                  <View
                    style={[
                      styles.avatarSelectionWrapper,
                      currentAvatar === item && {
                        borderColor: colors.primary,
                        borderWidth: 6,
                        borderRadius: 22,
                      }
                    ]}
                  >
                    <SvgAvatar svgString={item} size={80} />
                    {currentAvatar === item && (
                      <View style={[styles.selectedBadge, { backgroundColor: colors.primary }]}>
                        <IconSymbol size={14} name="checkmark" color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[
                styles.closeButton, 
                { backgroundColor: colors.inputBorder },
                pressedButton === 'close' && styles.modalButtonPressed
              ]}
              onPress={() => setAvatarModalVisible(false)}
              onPressIn={() => setPressedButton('close')}
              onPressOut={() => setPressedButton(null)}
              disabled={isUpdating}
              activeOpacity={1}
            >
              <Text style={[styles.modalButtonText, { color: colors.text }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        <View style={styles.profileHeader}>
          <TouchableOpacity 
            style={styles.avatarWrapper}
            onPress={() => setAvatarModalVisible(true)}
            activeOpacity={0.8}
          >
            <SvgAvatar svgString={currentAvatar} size={100} />
            <View style={[styles.avatarEditBubble, { backgroundColor: colors.primary }]}>
              <IconSymbol size={16} name="camera.fill" color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.usernameContainer}
            onPress={handleEditUsername}
            activeOpacity={0.7}
          >
            <Text style={[styles.profileTitle, { color: colors.text }]}>{username}</Text>
            <View style={[styles.editIconBubble, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#2C2C2E' }]}>
              <IconSymbol size={18} name="pencil" color="#FFFFFF" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.profileSubtitle, { color: colors.textSecondary }]}>
            {user?.email || ''}
          </Text>

          {/* Featured Achievement Badge */}
          {featuredAchievement && featuredAchievement.achievement && (
            <View 
              style={[
                styles.achievementBadge, 
                { 
                  backgroundColor: getTierColor(featuredAchievement.achievement.tier) + '20',
                  borderColor: getTierColor(featuredAchievement.achievement.tier),
                }
              ]}
            >
              <View style={[styles.achievementBadgeIcon, { backgroundColor: getTierColor(featuredAchievement.achievement.tier) + '40' }]}>
                <IconSymbol size={16} name={featuredAchievement.achievement.icon as any} color={getTierColor(featuredAchievement.achievement.tier)} />
              </View>
              <Text style={[styles.achievementBadgeText, { color: getTierColor(featuredAchievement.achievement.tier) }]}>
                {featuredAchievement.achievement.name}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity 
            style={[
              styles.menuItem, 
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              pressedItem === 'settings' && styles.menuItemPressed
            ]}
            onPress={() => router.push('/settings')}
            onPressIn={() => setPressedItem('settings')}
            onPressOut={() => setPressedItem(null)}
            activeOpacity={1}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="gear" color={colors.text} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Settings</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                App preferences and configuration
              </Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem, 
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              pressedItem === 'progress' && styles.menuItemPressed
            ]}
            onPress={() => router.push('/progress')}
            onPressIn={() => setPressedItem('progress')}
            onPressOut={() => setPressedItem(null)}
            activeOpacity={1}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="chart.bar.fill" color={colors.text} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Progress</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                View your learning statistics
              </Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem, 
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              pressedItem === 'notifications' && styles.menuItemPressed
            ]}
            onPress={() => router.push('/notifications')}
            onPressIn={() => setPressedItem('notifications')}
            onPressOut={() => setPressedItem(null)}
            activeOpacity={1}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="bell.fill" color={colors.text} />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: colors.text }]}>Notifications</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                Manage your notifications
              </Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.menuItem, 
              { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder },
              pressedItem === 'signout' && styles.menuItemPressed
            ]}
            onPress={handleSignOut}
            onPressIn={() => setPressedItem('signout')}
            onPressOut={() => setPressedItem(null)}
            activeOpacity={1}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: currentScheme === 'dark' ? '#3A3A3A' : '#F5F5F5' }]}>
              <IconSymbol size={20} name="arrow.right.square.fill" color="#FF3B30" />
            </View>
            <View style={styles.menuContent}>
              <Text style={[styles.menuTitle, { color: '#FF3B30' }]}>Sign Out</Text>
              <Text style={[styles.menuSubtitle, { color: colors.textSecondary }]}>
                Sign out of your account
              </Text>
            </View>
            <IconSymbol size={18} name="chevron.right" color={colors.textSecondary} />
          </TouchableOpacity>
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    alignItems: 'center',
  },
  timeText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 110,
  },
  profileHeader: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarEditBubble: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  editIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  profileTitle: {
    fontSize: 28,
    fontWeight: '700',
  },
  profileSubtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  achievementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    marginTop: 12,
  },
  achievementBadgeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  menuSection: {
    gap: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 4,
  },
  menuItemPressed: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    elevation: 1,
    transform: [{ translateY: 3 }],
  },
  menuIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 13,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 4,
  },
  modalButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.06,
    elevation: 1,
    transform: [{ translateY: 3 }],
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  avatarModalContent: {
    width: '90%',
    maxWidth: 450,
    maxHeight: '80%',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarGrid: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  avatarRow: {
    justifyContent: 'center',
  },
  avatarOption: {
    margin: 6,
  },
  avatarSelectionWrapper: {
    borderRadius: 22,
    borderWidth: 6,
    borderColor: 'transparent',
    position: 'relative',
  },
  selectedBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  closeButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 0,
    elevation: 4,
  },
});
