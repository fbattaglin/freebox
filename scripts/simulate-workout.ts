import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { generateWorkoutSession } from "../src/lib/llm-selector";
import { ExerciseLibrarySchema, SessionTemplatesDatabaseSchema } from "../src/lib/schemas";

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

function getSeparator(title: string) {
  const line = "=".repeat(60);
  return `\n${line}\n  ${title}\n${line}\n`;
}

async function runSimulation() {
  console.log("Initializing Freebox Workout Simulation...");

  // Load static files
  const dataDir = path.resolve(process.cwd(), "data");
  
  const exerciseLibData = JSON.parse(fs.readFileSync(path.join(dataDir, "exercise-library.json"), "utf-8"));
  const exerciseLibrary = ExerciseLibrarySchema.parse(exerciseLibData).exercises;

  const templatesData = JSON.parse(fs.readFileSync(path.join(dataDir, "session-templates.json"), "utf-8"));
  const templatesDb = SessionTemplatesDatabaseSchema.parse(templatesData);

  // Define inputs for the simulation
  const phase = "strength";
  const day = "Monday Lower";
  const recentExerciseIds = ["back_squat"]; // Try to avoid back_squat for accessory/secondary if possible

  // Locate template for Monday Lower - Strength
  const template = templatesDb.templates.find((t) => t.phase === phase && t.day === day);
  if (!template) {
    console.error(`Error: Could not find template for Phase: ${phase}, Day: ${day}`);
    process.exit(1);
  }

  console.log(`Loaded template for ${day} (${phase} phase).`);
  console.log(`Default template sets: Primary = 3, Secondary = 3, Accessory = 3\n`);

  // Scenario 1: Moderate Readiness (70) -> Volume remains standard (3 sets for all)
  console.log(getSeparator("SCENARIO A: MODERATE READINESS (Score: 70)"));
  console.log("Expected: Standard sets (Primary: 3, Secondary: 3, Accessory: 3)");
  const workoutA = await generateWorkoutSession({
    phase,
    day,
    template,
    exerciseLibrary,
    readinessScore: 70,
    weeklyHistory: recentExerciseIds.map(id => ({ dayName: "previous", why: "simulation", exercises: [{name: id}] })),
  });
  printWorkout(workoutA);

  // Scenario 2: High Readiness (90) -> Volume scales up (+1 set for all work slots, capped at 5)
  console.log(getSeparator("SCENARIO B: HIGH READINESS (Score: 90)"));
  console.log("Expected: Volumized sets (Primary: 4, Secondary: 4, Accessory: 4)");
  const workoutB = await generateWorkoutSession({
    phase,
    day,
    template,
    exerciseLibrary,
    readinessScore: 90,
    weeklyHistory: recentExerciseIds.map(id => ({ dayName: "previous", why: "simulation", exercises: [{name: id}] })),
  });
  printWorkout(workoutB);

  // Scenario 3: Low Readiness (30) -> Volume scales down (-1 set for secondary/accessory, minimum 2. Primary remains 3)
  console.log(getSeparator("SCENARIO C: LOW READINESS (Score: 30)"));
  console.log("Expected: Reduced sets (Primary: 3, Secondary: 2, Accessory: 2)");
  const workoutC = await generateWorkoutSession({
    phase,
    day,
    template,
    exerciseLibrary,
    readinessScore: 30,
    weeklyHistory: recentExerciseIds.map(id => ({ dayName: "previous", why: "simulation", exercises: [{name: id}] })),
  });
  printWorkout(workoutC);
}

function printWorkout(workout: any) {
  console.log(`\n\x1b[36mScientific Justification (Why):\x1b[0m ${workout.why}`);
  console.log("\n\x1b[36mSelected Exercises:\x1b[0m");
  
  workout.exercises.forEach((ex: any, idx: number) => {
    const intensity = ex.intensity_pct_1rm ? ` @ ${ex.intensity_pct_1rm}` : "";
    console.log(
      `  ${idx + 1}. [${ex.slot_type.toUpperCase()}] ${ex.name} (${ex.exercise_id})`
    );
    console.log(
      `     Sets/Reps: \x1b[33m${ex.sets} sets\x1b[0m x ${ex.reps}${intensity}`
    );
    console.log(`     Rest: ${ex.rest_min} min`);
    console.log(`     Cues:`);
    ex.cues.forEach((cue: string) => {
      console.log(`       - ${cue}`);
    });
    console.log("");
  });
}

runSimulation().catch((err) => {
  console.error("Simulation failed:", err);
  process.exit(1);
});
