import { NextResponse } from "next/server";
import { getCycleState } from "@/lib/cycle-math";
import { generateWorkoutSession } from "@/lib/llm-selector";
import { ExerciseLibrarySchema, SessionTemplatesDatabaseSchema } from "@/lib/schemas";

// Import JSON databases directly for bundler compatibility
import exerciseLibraryJson from "@/../data/exercise-library.json";
import sessionTemplatesJson from "@/../data/session-templates.json";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sleep, energy, recovery, cycleStartDate, activeDate, weeklyHistory = [], userProfile } = body;

    if (sleep === undefined || energy === undefined || recovery === undefined || !cycleStartDate) {
      return NextResponse.json(
        { error: "Missing required fields: sleep, energy, recovery, cycleStartDate." },
        { status: 400 }
      );
    }

    // 1. Calculate current week, phase, and training day
    const state = getCycleState(cycleStartDate, activeDate ? new Date(activeDate) : new Date());

    if (state.dayType === "rest") {
      return NextResponse.json({
        dayType: "rest",
        dayName: state.dayName,
        phase: state.phase,
        currentWeek: state.currentWeek,
        why: "Today is your scheduled rest day. Recover and prepare for the next training block.",
        exercises: [],
      });
    }

    if (state.dayType === "skills") {
      return NextResponse.json({
        dayType: "skills",
        dayName: state.dayName,
        phase: state.phase,
        currentWeek: state.currentWeek,
        why: "Saturday skills. Focus on motor control, relative strength, and calisthenics.",
        exercises: [], // Skills UI will pull from skills-library.json directly
      });
    }

    // Parse JSON assets against Zod schemas to ensure absolute safety
    const exerciseLibrary = ExerciseLibrarySchema.parse(exerciseLibraryJson).exercises;
    const templatesDb = SessionTemplatesDatabaseSchema.parse(sessionTemplatesJson);

    // 2. Find matching template
    const template = templatesDb.templates.find(
      (t) => t.phase === state.phase && t.day === state.dayName
    );

    if (!template) {
      return NextResponse.json(
        { error: `No template found for phase: ${state.phase}, day: ${state.dayName}` },
        { status: 500 }
      );
    }

    // 3. Calculate readiness score (average of the three metrics)
    const readinessScore = Math.round((sleep + energy + recovery) / 3);

    // 4. Generate the workout session (handles volume adaptation, LLM matching, Zod validations, fallback)
    const workout = await generateWorkoutSession({
      phase: state.phase,
      day: state.dayName,
      template,
      exerciseLibrary,
      readinessScore,
      weeklyHistory,
      userProfile,
    });

    // 5. Append cycle metadata to return a comprehensive view
    return NextResponse.json({
      dayType: "workout",
      currentWeek: state.currentWeek,
      isCycleCompleted: state.isCycleCompleted,
      readiness_score: readinessScore,
      ...workout,
    });

  } catch (error: any) {
    console.error("Error generating workout in API route:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate workout session." },
      { status: 500 }
    );
  }
}
