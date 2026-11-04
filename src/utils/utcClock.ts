// The X posting streak counts UTC calendar days (superhero-api updateStreak).
// Showing the current UTC time makes that day boundary visible in any timezone.
export const utcClock = (now: Date = new Date()): string => now.toISOString().slice(11, 16);
