import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions, Animated, useColorScheme } from 'react-native';
import { useState, useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { Asset } from 'expo-asset';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');

const slides = [
  {
    image: require('@/assets/images/slide_1.png'),
    title: 'AI-Generated Challenges',
    description: 'Every quiz is unique. Practice algorithms, data structures, and CS theory with fresh, AI-made questions each time.',
  },
  {
    image: require('@/assets/images/slide_2.png'),
    title: 'Challenge Your Friends',
    description: 'Create or join live lobbies, compete in real-time, and see who\'s the ultimate coding genius.',
  },
  {
    image: require('@/assets/images/slide_3.png'),
    title: 'Level Up Your Skills',
    description: 'Earn XP, climb leaderboards, and watch your CodeIQ+ score grow every day.',
  },
  {
    image: require('@/assets/images/slide_4.png'),
    title: 'Let\'s Code Smarter',
    description: 'Join CodeIQ+ and take your computer science knowledge to the next level.',
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buttonPressed, setButtonPressed] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const imageOpacities = useRef(
    slides.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))
  ).current;
  const textOpacities = useRef(
    slides.map((_, index) => new Animated.Value(index === 0 ? 1 : 0))
  ).current;

  // Preload all images when component mounts
  useEffect(() => {
    const loadImages = async () => {
      const imageAssets = slides.map(slide => Asset.fromModule(slide.image).downloadAsync());
      await Promise.all(imageAssets);
      setImagesLoaded(true);
    };
    loadImages();
  }, []);

  const handleContinue = () => {
    if (currentIndex < slides.length - 1) {
      const nextIndex = currentIndex + 1;
      
      // Fade out current image and text, fade in next image and text simultaneously
      Animated.parallel([
        Animated.timing(imageOpacities[currentIndex], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacities[nextIndex], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacities[currentIndex], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacities[nextIndex], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentIndex(nextIndex);
    } else {
      // Navigate to sign up page
      router.push('/sign-up');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      
      // Fade out current image and text, fade in previous image and text simultaneously
      Animated.parallel([
        Animated.timing(imageOpacities[currentIndex], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(imageOpacities[prevIndex], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacities[currentIndex], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(textOpacities[prevIndex], {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      
      setCurrentIndex(prevIndex);
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.progressBar,
              {
                backgroundColor: index <= currentIndex ? colors.primary : colors.inactiveProgress,
              },
            ]}
          />
        ))}
      </View>

      {/* Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={[styles.backIcon, { color: colors.backIcon }]}>‹</Text>
      </TouchableOpacity>

      {/* Content */}
      {imagesLoaded ? (
        <View style={styles.content}>
          {/* All Images - rendered at once with opacity control */}
          <View style={[
            styles.imageContainer,
            (currentIndex === 0 || currentIndex === 1 || currentIndex === 3) && styles.imageContainerLarge
          ]}>
            {slides.map((slide, index) => (
              <Animated.Image
                key={index}
                source={slide.image}
                style={[
                  styles.slideImage,
                  index === 0 && styles.slideImage1,
                  index === 1 && styles.slideImage2,
                  index === 3 && styles.slideImage4,
                  {
                    opacity: imageOpacities[index],
                    position: index === 0 ? 'relative' : 'absolute',
                  },
                ]}
                resizeMode="contain"
              />
            ))}
          </View>

          {/* Text Content - All texts rendered at once with opacity control */}
          <View style={styles.textContainerWrapper}>
            {slides.map((slide, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.textContainer,
                  (index === 0 || index === 1) && styles.textContainerHigher,
                  {
                    opacity: textOpacities[index],
                    position: index === 0 ? 'relative' : 'absolute',
                    width: '100%',
                  }
                ]}
              >
                <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
                <Text style={[styles.description, { color: colors.textSecondary }]}>{slide.description}</Text>
              </Animated.View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.content} />
      )}

      {/* Bottom Button */}
      <View style={styles.bottomSection}>
        {imagesLoaded && (
          <TouchableOpacity
            style={[
              styles.continueButton,
              { backgroundColor: colors.primary, shadowColor: colors.primaryShadow },
              buttonPressed && styles.continueButtonPressed
            ]}
            onPressIn={() => setButtonPressed(true)}
            onPressOut={() => setButtonPressed(false)}
            onPress={handleContinue}
            activeOpacity={1}
          >
            <Text style={[styles.continueButtonText, { color: colors.buttonText }]}>
              {currentIndex === slides.length - 1 ? 'Get Started →' : 'Continue'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 20,
  },
  backButton: {
    paddingLeft: 20,
    paddingVertical: 10,
    marginBottom: 20,
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'flex-start',
    paddingTop: 20,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  imageContainerLarge: {
    marginBottom: 15,
  },
  textContainerWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  textContainerHigher: {
    marginTop: -15,
  },
  slideImage: {
    width: width * 0.72,
    height: width * 0.72,
    maxWidth: 290,
    maxHeight: 290,
  },
  slideImage1: {
    width: width * 0.86,
    height: width * 0.86,
    maxWidth: 348,
    maxHeight: 348,
  },
  slideImage2: {
    width: width * 0.86,
    height: width * 0.86,
    maxWidth: 348,
    maxHeight: 348,
  },
  slideImage4: {
    width: width * 0.86,
    height: width * 0.86,
    maxWidth: 348,
    maxHeight: 348,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  continueButton: {
    paddingVertical: 18,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.6,
    shadowRadius: 0,
    elevation: 6,
  },
  continueButtonPressed: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    elevation: 2,
    transform: [{ translateY: 4 }],
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

