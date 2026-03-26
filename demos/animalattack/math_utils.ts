/**
 * Returns a random integer between 0 (inclusive) and max (exclusive).
 * @param max - The upper bound (exclusive) for the random integer.
 * @returns A random integer.
 */
export function randInt(max: number): number {
  return Math.floor(Math.random() * max);
}
