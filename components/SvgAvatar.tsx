import React from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

interface SvgAvatarProps {
  svgString: string;
  size?: number;
}

export function SvgAvatar({ svgString, size = 100 }: SvgAvatarProps) {
  const borderRadius = size * 0.18; // 18% of size for rounded corners
  const zoomedSize = size * 1.1; // 10% zoom
  
  const containerStyle = { 
    width: size, 
    height: size, 
    borderRadius: borderRadius,
    overflow: 'hidden' as const,
    borderWidth: 4,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  };

  // Native (iOS/Android): use react-native-svg
  return (
    <View style={containerStyle}>
      <SvgXml 
        xml={svgString} 
        width={zoomedSize} 
        height={zoomedSize} 
        preserveAspectRatio="xMidYMid slice"
      />
    </View>
  );
}

