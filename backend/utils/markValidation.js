// Shared validation for mark values. Returns an error message string,
// or null when the score/total pair is valid.
export const validateMarkValues = (score, total) => {
  const s = Number(score);
  const t = Number(total);

  if (!Number.isFinite(s) || !Number.isFinite(t)) {
    return "Score and total must be valid numbers";
  }
  if (t <= 0) {
    return "Total must be greater than 0";
  }
  if (s < 0) {
    return "Score cannot be negative";
  }
  if (s > t) {
    return "Score cannot be greater than total";
  }
  return null;
};
