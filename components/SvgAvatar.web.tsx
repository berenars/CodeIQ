import React from 'react';
import { View } from 'react-native';

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

  // Web-only: render SVG as HTML
  return (
    <View style={containerStyle}>
      <div
        style={{
          width: `${zoomedSize}px`,
          height: `${zoomedSize}px`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        dangerouslySetInnerHTML={{ __html: svgString }}
      />
    </View>
  );
}








