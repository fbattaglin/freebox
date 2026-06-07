import { z } from "zod";

// --- Enums & Literals based on Product Brief and Methodology ---

export const MovementPatternSchema = z.enum([
  "squat",
  "lunge",
  "hinge",
  "push_h",
  "push_v",
  "pull_h",
  "pull_v",
  "core",
  "plyo",
  "isolation",
  "carry",
]);

export const PhaseSchema = z.enum([
  "strength",
  "hypertrophy",
  "resistance",
  "explosive",
  "deload",
]);

export const WeekdaySchema = z.enum([
  "Monday Lower",
  "Tuesday Upper",
  "Wednesday Full",
  "Thursday Lower",
  "Friday Upper",
]);

export const EquipmentTierSchema = z.enum([
  "essential",
  "common",
  "specific",
  "exotic",
]);

export const SkillLevelSchema = z.enum([
  "basic",
  "intermediate",
  "advanced",
]);

export const FatigueCostSchema = z.enum([
  "low",
  "medium",
  "high",
]);

export const SlotTypeSchema = z.enum([
  "warmup",
  "core_activation",
  "primary",
  "secondary",
  "accessory",
  "cooldown",
]);

export const PhaseRoleSchema = z.enum([
  "primary",
  "secondary",
  "accessory",
  "none",
]);

// --- 1. Exercise Library Schema ---

export const ExerciseSchema = z.object({
  id: z.string(),
  name: z.string(),
  name_pt: z.string(),
  pattern: MovementPatternSchema,
  type: z.enum(["compound", "isolation"]),
  laterality: z.enum(["bilateral", "unilateral"]),
  primary_muscles: z.array(z.string()),
  secondary_muscles: z.array(z.string()),
  equipment: z.array(z.string()),
  equipment_tier: EquipmentTierSchema,
  skill_level: SkillLevelSchema,
  fatigue_cost: FatigueCostSchema,
  phase_roles: z.object({
    strength: PhaseRoleSchema,
    hypertrophy: PhaseRoleSchema,
    resistance: PhaseRoleSchema,
    explosive: PhaseRoleSchema,
  }),
  loading_profile: z.object({
    intensity_pct_1rm: z.array(z.number()).length(2).optional(),
    rep_range: z.array(z.number()).length(2),
  }),
  substitutes: z.array(z.string()),
  cues: z.array(z.string()),
});

export const ExerciseLibrarySchema = z.object({
  $schema_version: z.string().optional(),
  description: z.string().optional(),
  exercises: z.array(ExerciseSchema),
});

// --- 2. Session Templates Schema ---

export const SessionSlotSchema = z.object({
  type: SlotTypeSchema,
  duration_min: z.number().optional(),
  pattern: MovementPatternSchema.optional(),
  patterns: z.array(MovementPatternSchema).optional(),
  sets: z.number().int().positive().optional(),
  reps: z.string().optional(),
  intensity_pct_1rm: z.string().optional(),
  rest_min: z.number().nonnegative().optional(),
}).refine(
  (data) => {
    // If it's a structural working set (primary, secondary, accessory), it must define movements and sets/reps
    if (["primary", "secondary", "accessory"].includes(data.type)) {
      const hasMovement = !!data.pattern || (!!data.patterns && data.patterns.length > 0);
      const hasSetsReps = data.sets !== undefined && data.reps !== undefined;
      return hasMovement && hasSetsReps;
    }
    return true;
  },
  {
    message: "Primary, secondary, and accessory slots must have at least one movement pattern, sets, and reps defined.",
  }
);

export const SessionTemplateSchema = z.object({
  phase: PhaseSchema,
  day: WeekdaySchema,
  slots: z.array(SessionSlotSchema),
});

export const SessionTemplatesDatabaseSchema = z.object({
  $schema_version: z.string().optional(),
  description: z.string().optional(),
  templates: z.array(SessionTemplateSchema),
});

// --- 3. Skills Library Schema ---

export const SkillLevelItemSchema = z.object({
  level: z.number().int().min(1).max(6),
  id: z.string(),
  name: z.string(),
  name_pt: z.string(),
  description: z.string(),
  target: z.string(),
});

export const SkillFamilySchema = z.object({
  id: z.string(),
  name: z.string(),
  name_pt: z.string(),
  levels: z.array(SkillLevelItemSchema).length(6), // Strictly 6 levels per family
});

export const SkillsLibrarySchema = z.object({
  $schema_version: z.string().optional(),
  description: z.string().optional(),
  families: z.array(SkillFamilySchema),
});

// --- Export Types ---
export type Exercise = z.infer<typeof ExerciseSchema>;
export type ExerciseLibrary = z.infer<typeof ExerciseLibrarySchema>;
export type SessionSlot = z.infer<typeof SessionSlotSchema>;
export type SessionTemplate = z.infer<typeof SessionTemplateSchema>;
export type SessionTemplatesDatabase = z.infer<typeof SessionTemplatesDatabaseSchema>;
export type SkillLevelItem = z.infer<typeof SkillLevelItemSchema>;
export type SkillFamily = z.infer<typeof SkillFamilySchema>;
export type SkillsLibrary = z.infer<typeof SkillsLibrarySchema>;

// --- 4. LLM Workout Output Schema ---

export const LlmExerciseOutputSchema = z.object({
  slot_type: SlotTypeSchema,
  exercise_id: z.string(),
  name: z.string().optional(),
  sets: z.number().int().positive(),
  reps: z.string(),
  intensity_pct_1rm: z.string().nullable().optional(),
  rest_min: z.number().nonnegative(),
  cues: z.array(z.string()).optional(),
});

export const LlmWorkoutOutputSchema = z.object({
  why: z.string(),
  exercises: z.array(LlmExerciseOutputSchema),
});

export type LlmExerciseOutput = z.infer<typeof LlmExerciseOutputSchema>;
export type LlmWorkoutOutput = z.infer<typeof LlmWorkoutOutputSchema>;

export interface UserProfile {
  name?: string;
  age: string;
  weight: string;
  experience: string;
  limitations: string;
  longTermMemory?: string;
}
