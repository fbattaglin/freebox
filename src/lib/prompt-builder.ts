import { Exercise, SessionTemplate, SessionSlot, UserProfile } from "./schemas";

/**
 * Adapts the number of sets for a given slot type based on the daily readiness score.
 * - High Readiness (>= 80): Increase sets by 1 for primary, secondary, and accessory lifts (capped at 5).
 * - Low Readiness (< 50): Cut sets by 1 for secondary and accessory lifts (floor of 2). Primary is preserved.
 * - Moderate Readiness (50-79): Keep template default.
 */
export function adaptSlotVolume(
  sets: number,
  slotType: "primary" | "secondary" | "accessory" | string,
  readinessScore: number
): number {
  if (readinessScore >= 80) {
    if (["primary", "secondary", "accessory"].includes(slotType)) {
      return Math.min(sets + 1, 5);
    }
  } else if (readinessScore < 50) {
    if (slotType === "secondary" || slotType === "accessory") {
      return Math.max(sets - 1, 2);
    }
  }
  return sets;
}

interface BuildUserPromptParams {
  phase: string;
  day: string;
  template: SessionTemplate;
  exerciseLibrary: Exercise[];
  readinessScore: number;
  weeklyHistory: any[];
  userProfile?: UserProfile;
}

export function buildUserPrompt({
  phase,
  day,
  template,
  exerciseLibrary,
  readinessScore,
  weeklyHistory,
  userProfile,
}: BuildUserPromptParams): { prompt: string; adaptedTemplate: SessionTemplate } {
  
  // 1. Adapt the template volume based on readiness
  const adaptedSlots = template.slots.map((slot) => {
    if (slot.sets !== undefined && ["primary", "secondary", "accessory"].includes(slot.type)) {
      return {
        ...slot,
        sets: adaptSlotVolume(slot.sets, slot.type, readinessScore),
      };
    }
    return slot;
  });

  const adaptedTemplate: SessionTemplate = {
    ...template,
    slots: adaptedSlots,
  };

  // 2. Identify movement patterns required in this session
  const requiredPatterns = new Set<string>();
  for (const slot of template.slots) {
    if (slot.pattern) {
      requiredPatterns.add(slot.pattern);
    }
    if (slot.patterns) {
      for (const p of slot.patterns) {
        requiredPatterns.add(p);
      }
    }
  }

  // 3. Filter the library for relevant exercises:
  // - Must match one of the required movement patterns.
  // - Must be allowed in the current phase (phase_roles[current_phase] !== 'none').
  // - Must exclude specific/exotic equipment (as per methodology guidelines, keep only essential/common tiers).
  const filteredExercises = exerciseLibrary.filter((ex) => {
    const matchesPattern = requiredPatterns.has(ex.pattern);
    // Deload phase uses hypertrophy exercise pool as base
    const roleInPhase = phase === "deload" 
      ? ex.phase_roles.hypertrophy 
      : ex.phase_roles[phase as keyof typeof ex.phase_roles];
    const isAllowedInPhase = roleInPhase && roleInPhase !== "none";
    const isAllowedEquipment = ex.equipment_tier === "essential" || ex.equipment_tier === "common";

    return matchesPattern && isAllowedInPhase && isAllowedEquipment;
  });

  // 4. Construct the prompt string
  const prompt = `Generate a training session based on the following structured inputs:

--- ATHLETE PROFILE & PERSONALIZATION ---
${userProfile ? `Name: ${userProfile.name || "Athlete"}
Age: ${userProfile.age}
Bodyweight: ${userProfile.weight}
Experience Level: ${userProfile.experience}
Injuries or Limitations: ${userProfile.limitations || "None reported."}
${userProfile.longTermMemory ? `\n--- LONG-TERM ATHLETE MEMORY ---\n${userProfile.longTermMemory}\n` : ""}
IMPORTANT: You MUST adapt your exercise selection to respect these limitations and experience level.` : "No profile provided. Assume healthy intermediate athlete."}

--- SESSION DATA ---
Current phase of the cycle: ${phase}
Day of the week / Focus: ${day}
Daily readiness score: ${readinessScore}/100

--- TODAY'S TEMPLATE (SLOTS TO FILL) ---
Instructions: Fill only the slots of type "primary", "secondary", and "accessory" with exercises from the permitted filtered library below. Maintain exactly the provided "sets", "reps", "rest_min", and "intensity_pct_1rm" values.
${JSON.stringify(
  adaptedTemplate.slots.filter((s) => ["primary", "secondary", "accessory"].includes(s.type)),
  null,
  2
)}

--- WEEKLY CUMULATIVE CONTEXT (SPORTS SCIENCE ADJUSTMENT) ---
The following workouts were completed by the user in the past 7 days.
You MUST analyze the cumulative volume and fatigue of these workouts.
1. Avoid excessively loading muscle groups that were heavily stimulated in the past 48 hours.
2. In the "why" field of your JSON output, explicitly mention how you adapted today's session based on the fatigue from these past workouts and the readiness score. E.g. "Given the heavy axial loading from Monday's squats and a low readiness score, today's hinge pattern uses the 45-degree back extension to spare the CNS."
${weeklyHistory.length > 0 ? JSON.stringify(weeklyHistory.map((h: any) => ({ day: h.dayName, why: h.why, exercises: h.exercises.map((e: any) => e.name) })), null, 2) : "No recent history available."}

--- PERMITTED FILTERED EXERCISE LIBRARY (TOKEN OPTIMIZED) ---
Use ONLY exercises from this list. Use the exact "id" of each exercise. Do NOT hallucinate exercises.
${JSON.stringify(
  filteredExercises.map((ex) => ({
    id: ex.id,
    pattern: ex.pattern,
    equipment: ex.equipment,
    // Note: Cues and Name are stripped here to save token cost.
  })),
  null,
  2
)}
`;

  return {
    prompt,
    adaptedTemplate,
  };
}
