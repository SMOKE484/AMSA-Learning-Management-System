// @ts-ignore
import * as FileSystem from 'expo-file-system/legacy';
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

export const saveProfilePicture = async (
  userId: string,
  tempUri: string,
): Promise<string> => {
  console.log('[AvatarStorage] saveProfilePicture — userId:', userId, 'tempUri:', tempUri);
  const ext = tempUri.split('.').pop()?.split('?')[0] || 'jpg';
  const dir = FileSystem.documentDirectory + 'profile_pictures/';
  console.log('[AvatarStorage] target dir:', dir);
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const dest = dir + userId + '.' + ext;
  console.log('[AvatarStorage] copying to:', dest);
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  await AsyncStorage.setItem('amsa_profile_picture_' + userId, dest);
  console.log('[AvatarStorage] done — profile picture saved at:', dest);
  return dest;
};

export const getStoredProfilePicture = async (
  userId: string,
): Promise<string | null> => {
  const uri = await AsyncStorage.getItem('amsa_profile_picture_' + userId);
  if (!uri) return null;
  const info = await FileSystem.getInfoAsync(uri);
  return info.exists ? uri : null;
};

export const deleteProfilePicture = async (userId: string): Promise<void> => {
  const uri = await AsyncStorage.getItem('amsa_profile_picture_' + userId);
  if (uri) {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) await FileSystem.deleteAsync(uri, { idempotent: true });
  }
  await AsyncStorage.removeItem('amsa_profile_picture_' + userId);
};
