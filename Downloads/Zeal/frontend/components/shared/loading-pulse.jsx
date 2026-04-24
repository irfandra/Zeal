import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const LoadingPulse = ({ label = 'Loading...' }) => {
  const dotA = useRef(new Animated.Value(0.45)).current;
  const dotB = useRef(new Animated.Value(0.45)).current;
  const dotC = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animateDot = (dot, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 360,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.45,
            duration: 360,
            useNativeDriver: true,
          }),
        ])
      );

    const loopA = animateDot(dotA, 0);
    const loopB = animateDot(dotB, 120);
    const loopC = animateDot(dotC, 240);

    loopA.start();
    loopB.start();
    loopC.start();

    return () => {
      loopA.stop();
      loopB.stop();
      loopC.stop();
    };
  }, [dotA, dotB, dotC]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Animated.View style={[styles.dot, { opacity: dotA, transform: [{ scale: dotA }] }]} />
        <Animated.View style={[styles.dot, { opacity: dotB, transform: [{ scale: dotB }] }]} />
        <Animated.View style={[styles.dot, { opacity: dotC, transform: [{ scale: dotC }] }]} />
      </View>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#111',
  },
  text: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500',
  },
});

export default LoadingPulse;
