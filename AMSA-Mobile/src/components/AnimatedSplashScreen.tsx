import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Dimensions,
  Easing,
} from 'react-native';

import { BRAND } from './theme';

const { width, height } = Dimensions.get('window');

interface AnimatedSplashScreenProps {
  onAnimationEnd: () => void;
}

export const AnimatedSplashScreen: React.FC<AnimatedSplashScreenProps> = ({
  onAnimationEnd,
}) => {
  // Logo
  const logoFade      = useRef(new Animated.Value(0)).current;
  const logoScale     = useRef(new Animated.Value(0.35)).current;
  const logoY         = useRef(new Animated.Value(30)).current;

  // Three chevron streaks that fly in from the left
  const streak1X      = useRef(new Animated.Value(-width)).current;
  const streak2X      = useRef(new Animated.Value(-width)).current;
  const streak3X      = useRef(new Animated.Value(-width)).current;
  const streakFade    = useRef(new Animated.Value(0)).current;

  // Pulsing accent rings (teal + red, staggered)
  const ring1Scale    = useRef(new Animated.Value(0.8)).current;
  const ring1Opacity  = useRef(new Animated.Value(0)).current;
  const ring2Scale    = useRef(new Animated.Value(0.8)).current;
  const ring2Opacity  = useRef(new Animated.Value(0)).current;

  // Shimmer sweep
  const shimmerX      = useRef(new Animated.Value(-width)).current;

  // Full-screen exit
  const screenFade    = useRef(new Animated.Value(1)).current;

  // ── helpers ───────────────────────────────────────────────────────────────
  const startPulseRings = () => {
    ring1Scale.setValue(0.8);
    ring1Opacity.setValue(0.7);
    ring2Scale.setValue(0.8);
    ring2Opacity.setValue(0.7);

    Animated.loop(
      Animated.parallel([
        // ring 1 — teal
        Animated.sequence([
          Animated.parallel([
            Animated.timing(ring1Scale, {
              toValue: 1.7,
              duration: 900,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(ring1Opacity, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(300),
        ]),
        // ring 2 — red, staggered 450 ms later
        Animated.sequence([
          Animated.delay(450),
          Animated.parallel([
            Animated.timing(ring2Scale, {
              toValue: 1.7,
              duration: 900,
              easing: Easing.out(Easing.ease),
              useNativeDriver: true,
            }),
            Animated.timing(ring2Opacity, {
              toValue: 0,
              duration: 900,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    ).start();
  };

  const startShimmer = () => {
    shimmerX.setValue(-width * 0.9);
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerX, {
          toValue: width * 0.9,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(600),
      ])
    ).start();
  };

  // ── main sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    // Stage 1 — chevron streaks fly across (gives energy before logo appears)
    Animated.sequence([
      Animated.timing(streakFade, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.parallel([
        Animated.timing(streak1X, {
          toValue: width * 1.2,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(80),
          Animated.timing(streak2X, {
            toValue: width * 1.2,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(160),
          Animated.timing(streak3X, {
            toValue: width * 1.2,
            duration: 420,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start(() => {
      // Stage 2 — logo materialises
      Animated.parallel([
        Animated.timing(logoFade, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 90,
          useNativeDriver: true,
        }),
        Animated.timing(logoY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.back(1.4)),
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Stage 3 — hold with pulse rings + shimmer
        startPulseRings();
        startShimmer();

        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(screenFade, {
            toValue: 0,
            duration: 650,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start(() => onAnimationEnd());
      });
    });
  }, []);

  const logoW = width * 0.72;
  const logoH = logoW * 0.28; // aspect ratio of the AMSA logo (~3.6 : 1)
  const ringSize = logoW * 0.9;

  return (
    <Animated.View style={[styles.container, { opacity: screenFade }]}>

      {/* ── Chevron streak 1 — red ── */}
      <Animated.View
        style={[
          styles.streak,
          {
            top: height * 0.5 - 18,
            height: 12,
            backgroundColor: BRAND.red,
            opacity: streakFade,
            transform: [{ translateX: streak1X }],
          },
        ]}
      />

      {/* ── Chevron streak 2 — yellow ── */}
      <Animated.View
        style={[
          styles.streak,
          {
            top: height * 0.5 - 2,
            height: 10,
            backgroundColor: BRAND.yellow,
            opacity: streakFade,
            transform: [{ translateX: streak2X }],
          },
        ]}
      />

      {/* ── Chevron streak 3 — teal ── */}
      <Animated.View
        style={[
          styles.streak,
          {
            top: height * 0.5 + 12,
            height: 10,
            backgroundColor: BRAND.teal,
            opacity: streakFade,
            transform: [{ translateX: streak3X }],
          },
        ]}
      />

      {/* ── Pulse ring 1 — teal ── */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: BRAND.teal,
            opacity: ring1Opacity,
            transform: [{ scale: ring1Scale }],
          },
        ]}
      />

      {/* ── Pulse ring 2 — red ── */}
      <Animated.View
        style={[
          styles.ring,
          {
            width: ringSize,
            height: ringSize,
            borderRadius: ringSize / 2,
            borderColor: BRAND.red,
            opacity: ring2Opacity,
            transform: [{ scale: ring2Scale }],
          },
        ]}
      />

      {/* ── Logo + shimmer ── */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            width: logoW,
            height: logoH,
            opacity: logoFade,
            transform: [
              { scale: logoScale },
              { translateY: logoY },
            ],
          },
        ]}
      >
        <Image
          source={require('../../assets/amsaLogo.png')}
          style={{ width: logoW, height: logoH }}
          resizeMode="contain"
        />

        {/* Diagonal shimmer sweep */}
        <Animated.View
          style={[
            styles.shimmer,
            { transform: [{ translateX: shimmerX }, { rotate: '18deg' }] },
          ]}
          pointerEvents="none"
        />
      </Animated.View>

    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: BRAND.bg,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    overflow: 'hidden',
  },
  streak: {
    position: 'absolute',
    left: -width * 0.1,
    width: width * 1.2,
    borderRadius: 6,
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    backgroundColor: 'transparent',
  },
  logoWrapper: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    position: 'absolute',
    top: -30,
    width: 55,
    height: '300%',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});