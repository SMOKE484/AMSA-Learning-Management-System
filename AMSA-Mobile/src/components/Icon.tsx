import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { iconsMap } from './icons';

interface IconProps {
  name: keyof typeof iconsMap;
  size?: number;
  color?: string;
  style?: any;
}

export const Icon = ({ name, size = 24, color = '#000', style }: IconProps) => {
  const pathData = iconsMap[name];
  if (!pathData) {
    console.warn(`Icon "${name}" not found in iconsMap`);
    return null;
  }

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      <Path fill={color} d={pathData} />
    </Svg>
  );
};