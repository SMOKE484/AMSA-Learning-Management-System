export const getAvatarUrl = (seed) =>
  `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed || 'default')}`;
