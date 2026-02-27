// src/components/BouncingDotsLoader.tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import { BRAND } from './theme';

interface Props {
  size?:   number;
  colors?: [string, string, string];
}

const BouncingDotsLoader: React.FC<Props> = ({
  size   = 16,
  colors = [BRAND.red, BRAND.yellow, BRAND.teal],
}) => {
  const translateY = useRef(colors.map(() => new Animated.Value(0))).current;
  const scale      = useRef(colors.map(() => new Animated.Value(1))).current;
  const opacity    = useRef(colors.map(() => new Animated.Value(0.5))).current;

  useEffect(() => {
    const RISE_DURATION   = 380;
    const FALL_DURATION   = 460;
    const STAGGER_DELAY   = 160;
    const BOUNCE_HEIGHT   = size * 1.6;

    const buildLoop = (i: number) =>
      Animated.loop(
        Animated.sequence([
          // ── Rise: dot lifts up, grows slightly, brightens ──────────────
          Animated.parallel([
            Animated.timing(translateY[i], {
              toValue:         -BOUNCE_HEIGHT,
              duration:        RISE_DURATION,
              easing:          Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(scale[i], {
              toValue:         1.25,
              duration:        RISE_DURATION,
              easing:          Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(opacity[i], {
              toValue:         1,
              duration:        RISE_DURATION,
              easing:          Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          // ── Fall: dot drops back with a natural squash ──────────────────
          Animated.parallel([
            Animated.timing(translateY[i], {
              toValue:         0,
              duration:        FALL_DURATION,
              easing:          Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.sequence([
              // hold scale while falling
              Animated.timing(scale[i], {
                toValue:         1,
                duration:        FALL_DURATION * 0.7,
                easing:          Easing.in(Easing.quad),
                useNativeDriver: true,
              }),
              // tiny squash on landing
              Animated.timing(scale[i], {
                toValue:         0.85,
                duration:        FALL_DURATION * 0.15,
                easing:          Easing.out(Easing.quad),
                useNativeDriver: true,
              }),
              // rebound
              Animated.timing(scale[i], {
                toValue:         1,
                duration:        FALL_DURATION * 0.15,
                easing:          Easing.out(Easing.elastic(1.5)),
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(opacity[i], {
              toValue:         0.5,
              duration:        FALL_DURATION,
              easing:          Easing.in(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      );

    const loops = colors.map((_, i) => buildLoop(i));
    const staggered = Animated.stagger(STAGGER_DELAY, loops);
    staggered.start();

    return () => staggered.stop();
  }, []);

  return (
    <View style={styles.container}>
      {colors.map((color, i) => (
        <View key={i} style={styles.dotWrapper}>
          {/* Glow layer */}
          <Animated.View
            style={[
              styles.glow,
              {
                width:        size * 2.2,
                height:       size * 2.2,
                borderRadius: size * 1.1,
                backgroundColor: color,
                opacity:         Animated.multiply(opacity[i], 0.18),
                transform:       [{ scale: scale[i] }],
              },
            ]}
          />
          {/* Dot */}
          <Animated.View
            style={[
              styles.dot,
              {
                width:           size,
                height:          size,
                borderRadius:    size / 2,
                backgroundColor: color,
                opacity:         opacity[i],
                transform:       [
                  { translateY: translateY[i] },
                  { scale:      scale[i]      },
                ],
                shadowColor:   color,
                shadowOffset:  { width: 0, height: 2 },
                shadowOpacity: 0.6,
                shadowRadius:  size * 0.5,
                elevation:     4,
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'flex-end',
    gap:             10,
    // Reserve vertical space so siblings don't jump as dots bounce up
    height:          60,
  },
  dotWrapper: {
    justifyContent: 'center',
    alignItems:     'center',
  },
  glow: {
    position: 'absolute',
  },
  dot: {},
});

export default BouncingDotsLoader;