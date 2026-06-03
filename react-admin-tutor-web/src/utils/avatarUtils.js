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

export const getAvatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(seed || 'default')}`;

export const getStoredAvatarSeed = (userId) =>
  localStorage.getItem(`amsa_avatar_${userId}`);

export const saveAvatarSeed = (userId, seed) =>
  localStorage.setItem(`amsa_avatar_${userId}`, seed);
