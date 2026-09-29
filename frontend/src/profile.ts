export function interpolateProfile(
  profile: number[],
  depth: number,
  totalDepth: number,
): number | null {
  if (profile.length === 0 || !Number.isFinite(depth) || totalDepth <= 0) return null;
  if (profile.length === 1) return profile[0];
  const position = Math.max(0, Math.min(1, depth / totalDepth)) * (profile.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.min(profile.length - 1, lowerIndex + 1);
  const fraction = position - lowerIndex;
  return profile[lowerIndex] + (profile[upperIndex] - profile[lowerIndex]) * fraction;
}
