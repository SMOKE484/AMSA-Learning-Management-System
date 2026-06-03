import AsyncStorage from '@react-native-async-storage/async-storage';

export const AVATAR_SEEDS = [
  'Felix', 'Marcus', 'Oliver', 'Ethan',
  'Lucas', 'Noah', 'Leo', 'Kai',
  'Liam', 'Aiden', 'Mason', 'Dylan',
  'Hunter', 'Cole', 'Blake', 'Jayden',
  'Sophia', 'Mia', 'Zoe', 'Luna',
  'Aria', 'Chloe', 'Maya', 'Ella',
  'Hannah', 'Emma', 'Lily', 'Grace',
  'Ava', 'Nora', 'Ruby', 'Ivy',
];

export const getStoredAvatarSeed = (userId: string): Promise<string | null> =>
  AsyncStorage.getItem(`amsa_avatar_${userId}`);

export const saveAvatarSeed = (userId: string, seed: string): Promise<void> =>
  AsyncStorage.setItem(`amsa_avatar_${userId}`, seed);
