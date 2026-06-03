export const getAvatarUrl = (seed?: string | null): string =>
  `https://api.dicebear.com/9.x/fun-emoji/png?seed=${encodeURIComponent(seed || 'default')}`;
