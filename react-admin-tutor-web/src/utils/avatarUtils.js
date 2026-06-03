export const getAvatarUrl = (seed) =>
  `https://api.multiavatar.com/${encodeURIComponent(seed || 'default')}.svg`;
