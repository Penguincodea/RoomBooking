import React, { useEffect, useState } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

export function FadeInView({
  children,
  delay = 0,
  style,
  ...props
}: ViewProps & { delay?: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: 420,
      delay,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress]);

  return (
    <Animated.View
      {...props}
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type PressableScaleProps = PressableProps & {
  scaleTo?: number;
  containerStyle?: StyleProp<ViewStyle>;
};

export function PressableScale({
  children,
  disabled,
  onPressIn,
  onPressOut,
  scaleTo = 0.975,
  containerStyle,
  ...props
}: PressableScaleProps) {
  const [scale] = useState(() => new Animated.Value(1));

  const animateScale = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      stiffness: 420,
      damping: 28,
      mass: 0.7,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        disabled={disabled}
        onPressIn={(event) => {
          if (!disabled) animateScale(scaleTo);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animateScale(1);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
