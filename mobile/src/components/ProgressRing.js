import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../utils/constants';

export default function ProgressRing({
  size = 80,
  strokeWidth = 8,
  progress = 0,
  color = COLORS.primary,
  bgColor = COLORS.bg3,
  label,
  value,
  valueStyle,
  labelStyle,
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, progress));
  const dashOffset = circumference - (circumference * clamped) / 100;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={StyleSheet.absoluteFill}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {(value !== undefined || label !== undefined) && (
        <View style={styles.center}>
          {value !== undefined && (
            <Text style={[styles.value, valueStyle]}>{value}</Text>
          )}
          {label !== undefined && (
            <Text style={[styles.label, labelStyle]}>{label}</Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    lineHeight: 22,
  },
  label: {
    fontSize: 10,
    color: COLORS.text2,
    marginTop: 1,
  },
});
