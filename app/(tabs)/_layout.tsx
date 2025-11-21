import { Tabs } from 'expo-router';
import React from 'react';
import { Dimensions, View, Platform, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

export default function TabLayout() {
  const { currentScheme } = useTheme();
  const colors = Colors[currentScheme];
  
  const screenWidth = Dimensions.get('window').width;
  const tabBarWidth = 260;
  const centerMargin = (screenWidth - tabBarWidth) / 2;

  const TabBarBackground = ({ focused }: { focused: boolean }) => {
    if (!focused) return null;
    return (
      <View
        style={{
          position: 'absolute',
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          backgroundColor: '#6A994E',
          opacity: 0.15,
          borderRadius: 14,
          margin: 2,
        }}
      />
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#6A994E',
        tabBarInactiveTintColor: currentScheme === 'dark' ? '#808080' : '#9CA3AF',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          position: 'absolute',
          bottom: 35,
          marginLeft: centerMargin,
          width: tabBarWidth,
          elevation: 8,
          backgroundColor: 'transparent',
          borderRadius: 18,
          height: 64,
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: currentScheme === 'dark' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: currentScheme === 'dark' ? 0.5 : 0.15,
          shadowRadius: 16,
          paddingTop: 6,
          paddingBottom: 6,
          paddingHorizontal: 6,
          overflow: 'hidden',
        },
        tabBarBackground: () => (
          <View style={{ flex: 1, overflow: 'hidden', borderRadius: 18 }}>
            <BlurView
              intensity={100}
              tint={currentScheme === 'dark' ? 'dark' : 'light'}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Subtle gradient overlay for better visibility */}
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: currentScheme === 'dark' 
                  ? 'rgba(28, 28, 30, 0.75)' 
                  : 'rgba(255, 255, 255, 0.75)',
              }}
            />
            {/* Vibrancy effect - lighter overlay for depth */}
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: currentScheme === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.02)',
              }}
            />
          </View>
        ),
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
          paddingHorizontal: 2,
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 52,
          gap: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <>
              <TabBarBackground focused={focused} />
              <IconSymbol size={24} name="house.fill" color={color} />
            </>
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Online',
          tabBarIcon: ({ color, focused }) => (
            <>
              <TabBarBackground focused={focused} />
              <IconSymbol size={24} name="person.2.fill" color={color} />
            </>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'You',
          tabBarIcon: ({ color, focused }) => (
            <>
              <TabBarBackground focused={focused} />
              <IconSymbol size={24} name="person.fill" color={color} />
            </>
          ),
        }}
      />
    </Tabs>
  );
}