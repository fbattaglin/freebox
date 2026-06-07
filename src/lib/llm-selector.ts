import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  Exercise,
  SessionTemplate,
  LlmWorkoutOutput,
  LlmWorkoutOutputSchema,
} from "./schemas";
import { buildUserPrompt } from "./prompt-builder";
import { systemPrompt } from "../prompts/system-prompt";

// Helper to check for offline/fallback mode
const isApiKeyConfigured = (): boolean => {
  const key = process.env.ANTHROPIC_API_KEY;
  return !!key && key !== "your_api_key_here" && key.trim() !== "";
};

/**
 * Deterministic local fallback generator when Claude is offline, rate-limited, or API key is not set.
 * It fills the template slots sequentially by picking matching exercises from the library.
 */
export function generateLocalFallbackWorkout({
  phase,
  day,
  adaptedTemplate,
  exerciseLibrary,
  readinessScore,
}: {
  phase: string;
  day: string;
  adaptedTemplate: SessionTemplate;
  exerciseLibrary: Exercise[];
  readinessScore: number;
}): LlmWorkoutOutput {
  const exercises: LlmWorkoutOutput["exercises"] = [];

  for (const slot of adaptedTemplate.slots) {
    if (!["primary", "secondary", "accessory"].includes(slot.type)) {
      continue; // Skip warmup, core_activation, cooldown
    }

    const patterns = slot.pattern ? [slot.pattern] : (slot.patterns || []);
    
    // Find first exercise in library matching one of the patterns and phase role
    const match = exerciseLibrary.find((ex) => {
      const matchesPattern = patterns.includes(ex.pattern);
      // Deload phase uses hypertrophy exercise pool as base
      const roleInPhase = phase === "deload" 
        ? ex.phase_roles.hypertrophy 
        : ex.phase_roles[phase as keyof typeof ex.phase_roles];
      const isAllowedInPhase = roleInPhase && roleInPhase !== "none";
      const isAllowedEquipment = ex.equipment_tier === "essential" || ex.equipment_tier === "common";

      return matchesPattern && isAllowedInPhase && isAllowedEquipment;
    });

    if (match) {
      exercises.push({
        slot_type: slot.type as "primary" | "secondary" | "accessory",
        exercise_id: match.id,
        name: match.name,
        sets: slot.sets || 3,
        reps: slot.reps || "8-12",
        intensity_pct_1rm: slot.intensity_pct_1rm || null,
        rest_min: slot.rest_min || 1.5,
        cues: match.cues,
      });
    }
  }

  return {
    why: `Session structured locally for ${day.toLowerCase()} during the ${phase} phase due to local simulation or Claude API unavailability.`,
    exercises,
  };
}

import { UserProfile } from "./schemas";

interface GenerateWorkoutParams {
  phase: string;
  day: string;
  template: SessionTemplate;
  exerciseLibrary: Exercise[];
  readinessScore: number;
  weeklyHistory: any[];
  userProfile?: UserProfile;
}

export async function generateWorkoutSession({
  phase,
  day,
  template,
  exerciseLibrary,
  readinessScore,
  weeklyHistory,
  userProfile,
}: GenerateWorkoutParams): Promise<LlmWorkoutOutput> {
  
  // 1. Build the prompt and get adapted template (volume calculations already completed programmatically)
  const { prompt: userPrompt, adaptedTemplate } = buildUserPrompt({
    phase,
    day,
    template,
    exerciseLibrary,
    readinessScore,
    weeklyHistory,
    userProfile,
  });

  // 2. If Anthropic API key is not configured, run in deterministic local fallback mode immediately
  if (!isApiKeyConfigured()) {
    console.warn("ANTHROPIC_API_KEY is not configured or contains placeholder. Activating local fallback generator...");
    return generateLocalFallbackWorkout({
      phase,
      day,
      adaptedTemplate,
      exerciseLibrary,
      readinessScore,
    });
  }

  // 3. Initialize Anthropic SDK client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userPrompt },
  ];

  let attempt = 0;
  const maxAttempts = 3;

  while (attempt < maxAttempts) {
    attempt++;
    console.log(`Sending session generation request to Claude (Attempt ${attempt}/${maxAttempts})...`);
    
    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
        temperature: 0.1, // Low temperature for highly deterministic selections
        system: systemPrompt,
        messages: messages,
      });

      const textResponse = response.content[0].type === "text" ? response.content[0].text : "";
      
      // Parse JSON
      let parsedOutput: any;
      try {
        parsedOutput = JSON.parse(textResponse.trim());
      } catch (jsonError: any) {
        throw new Error(`JSON parsing failed: ${jsonError.message}. Ensure response contains only valid JSON.`);
      }

      // Validate Zod Schema
      const validatedWorkout = LlmWorkoutOutputSchema.parse(parsedOutput);

      // Validate Business Logic Rules
      const errors: string[] = [];

      // Check exercises IDs and patterns
      for (const ex of validatedWorkout.exercises) {
        // Find exercise in library
        const libraryMatch = exerciseLibrary.find((lib) => lib.id === ex.exercise_id);
        
        if (!libraryMatch) {
          errors.push(`Exercise ID "${ex.exercise_id}" does not exist in the exercise library.`);
          continue;
        }

        // Hydrate name and cues locally to save LLM tokens
        ex.name = libraryMatch.name;
        ex.cues = libraryMatch.cues;

        // Check if the exercise matches the required slot pattern
        const slotTemplate = adaptedTemplate.slots.find((slot) => slot.type === ex.slot_type);
        if (slotTemplate) {
          const allowedPatterns = slotTemplate.pattern ? [slotTemplate.pattern] : (slotTemplate.patterns || []);
          if (!allowedPatterns.includes(libraryMatch.pattern)) {
            errors.push(`Exercise "${ex.exercise_id}" has pattern "${libraryMatch.pattern}" but slot "${ex.slot_type}" requires one of: [${allowedPatterns.join(", ")}].`);
          }
        }
      }

      // If we have business logic validation errors, raise them to trigger retry
      if (errors.length > 0) {
        throw new Error(`Business logic validation failed:\n${errors.join("\n")}`);
      }

      // Everything passed! Log success and return.
      console.log("Claude response successfully validated against schema and methodology constraints!");
      return validatedWorkout;

    } catch (error: any) {
      console.error(`Attempt ${attempt} failed with error:`, error.message || error);

      if (attempt === maxAttempts) {
        console.error("Max LLM selection retry attempts reached. Initiating local fallback...");
        return generateLocalFallbackWorkout({
          phase,
          day,
          adaptedTemplate,
          exerciseLibrary,
          readinessScore,
        });
      }

      // Add Claude's invalid response and the error explanation to the messages array for correction
      messages.push({
        role: "assistant",
        content: error.message && error.message.includes("JSON") ? "Invalid JSON output." : "Invalid format or rule constraint violation.",
      });

      messages.push({
        role: "user",
        content: `Your previous response failed the following validation checks:
${error.message}

Please correct the errors above. Ensure that you:
1. Use ONLY exercise IDs that exist in the permitted filtered exercise library and correspond to the required movement patterns.
2. Strictly follow the copywriting rules (sentence case, no exclamation marks, no emojis).
3. Respond strictly in raw JSON without any markdown formatting tags or conversational filler.`
      });
    }
  }

  // Fallback as safe guard
  return generateLocalFallbackWorkout({
    phase,
    day,
    adaptedTemplate,
    exerciseLibrary,
    readinessScore,
  });
}
