export interface CycleState {
  currentWeek: number;
  phase: "strength" | "hypertrophy" | "resistance" | "explosive" | "deload";
  dayName: string;
  dayType: "workout" | "skills" | "rest";
  isCycleCompleted: boolean;
}

/**
 * Returns the cycle state (week, phase, training day) based on a cycle start date.
 * - Week is calculated from startDate (1-indexed).
 * - Phase is mapped from the week (1-3: strength, 4-6: hypertrophy, 7-8: resistance, 9-10: explosive, 11: deload).
 * - DayName is mapped from the current weekday (Monday to Sunday).
 */
export function getCycleState(startDateStr: string, targetDate: Date = new Date()): CycleState {
  // Parse as local date components to prevent UTC midnight shift in negative timezones
  // e.g., new Date("2026-06-01") creates UTC midnight = May 31st 18:00 in UTC-6
  const [y, m, d] = startDateStr.split('-').map(Number);
  const startDate = new Date(y, m - 1, d);
  startDate.setHours(0, 0, 0, 0);
  const checkDate = new Date(targetDate);
  checkDate.setHours(0, 0, 0, 0);

  const diffTime = checkDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Calculate current week (1-indexed)
  // 0-6 days = week 1, 7-13 days = week 2, etc.
  const currentWeek = diffDays >= 0 ? Math.floor(diffDays / 7) + 1 : 1;
  const isCycleCompleted = currentWeek > 11;

  // Map week to phase
  let phase: CycleState["phase"] = "strength";
  if (currentWeek >= 1 && currentWeek <= 3) {
    phase = "strength";
  } else if (currentWeek >= 4 && currentWeek <= 6) {
    phase = "hypertrophy";
  } else if (currentWeek >= 7 && currentWeek <= 8) {
    phase = "resistance";
  } else if (currentWeek >= 9 && currentWeek <= 10) {
    phase = "explosive";
  } else if (currentWeek === 11 || isCycleCompleted) {
    phase = "deload";
  }

  // Get current weekday name in Portuguese and map to training day slot
  // getDay() returns: 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const weekday = checkDate.getDay();
  let dayName = "Rest";
  let dayType: CycleState["dayType"] = "rest";

  switch (weekday) {
    case 1:
      dayName = "Monday Lower";
      dayType = "workout";
      break;
    case 2:
      dayName = "Tuesday Upper";
      dayType = "workout";
      break;
    case 3:
      dayName = "Wednesday Full";
      dayType = "workout";
      break;
    case 4:
      dayName = "Thursday Lower";
      dayType = "workout";
      break;
    case 5:
      dayName = "Friday Upper";
      dayType = "workout";
      break;
    case 6:
      dayName = "Saturday Skills";
      dayType = "skills";
      break;
    case 0:
    default:
      dayName = "Rest";
      dayType = "rest";
      break;
  }

  return {
    currentWeek: isCycleCompleted ? 11 : currentWeek,
    phase,
    dayName,
    dayType,
    isCycleCompleted,
  };
}
