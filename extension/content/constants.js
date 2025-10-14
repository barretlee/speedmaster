export const SPEED_OPTIONS = [
  0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4,
  4.25, 4.5, 4.75, 5, 6, 7, 8, 9, 10, 12, 14, 15
];
export const MIN_SPEED = 0.5;
export const DEFAULT_MAX_SPEED = 5;
export const ABSOLUTE_MAX_SPEED = 15;
export const SPEED_STEP = 0.25;
export const SKIP_SPEED = 15;

export function clampSpeed(value, maxSpeed = DEFAULT_MAX_SPEED) {
  const upperBound = Math.min(Math.max(MIN_SPEED, maxSpeed), ABSOLUTE_MAX_SPEED);
  return Math.min(Math.max(MIN_SPEED, value), upperBound);
}

export function getSpeedOptions(maxSpeed = DEFAULT_MAX_SPEED) {
  const upperBound = Math.min(Math.max(MIN_SPEED, maxSpeed), ABSOLUTE_MAX_SPEED);
  const options = SPEED_OPTIONS.filter((speed) => speed <= upperBound);
  if (!options.includes(1)) options.push(1);
  const sorted = Array.from(new Set(options)).sort((a, b) => a - b);
  return sorted;
}
