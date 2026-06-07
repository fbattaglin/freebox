import { NextResponse } from "next/server";
import { Anthropic } from "@anthropic-ai/sdk";

export async function POST(request: Request) {
  try {
    // 0. Verify security passcode (if configured)
    const passcode = request.headers.get("x-freebox-passcode");
    const requiredPasscode = process.env.FREEBOX_PASSCODE;
    
    if (requiredPasscode && passcode !== requiredPasscode) {
      return NextResponse.json(
        { error: "access denied: invalid or missing security passcode. please enter the correct passcode in settings." },
        { status: 401 }
      );
    }

    const { history } = await request.json();

    if (!history || !Array.isArray(history) || history.length === 0) {
      return NextResponse.json({ error: "No history provided for debrief." }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      // Local fallback if no API key
      return NextResponse.json({
        memory: "Local Simulation: Athlete completed an 11-week cycle. Adherence was high. Proceed with current template strategy."
      });
    }

    const anthropic = new Anthropic({ apiKey });

    // Format history for the LLM (distilled to save tokens)
    const formattedHistory = history.map((entry) => ({
      date: entry.date,
      phase: entry.phase,
      day: entry.dayName,
      exercises: entry.exercises.map((ex: any) => ({
        id: ex.id,
        perf: ex.setsData.map((s: any) => `${s.weight}kg x ${s.reps}`).join(", ")
      }))
    }));

    const prompt = `You are a Distinguished Sports Scientist.
The user has just completed an 11-week training cycle.
Below is a highly compressed JSON log of their performance across the cycle.

Your task is to analyze this history and output EXACTLY THREE PARAGRAPHS in raw markdown (no headings, just paragraphs) summarizing:
1. Overall progression and consistency.
2. Specific mechanical plateaus or successes (e.g., "Plateaued on squats at X kg").
3. Scientific recommendations for their next cycle based on this data.

DO NOT use exclamation marks. Keep a sober, clinical tone.
Do not wrap your response in JSON. Output pure text.

--- COMPRESSED HISTORY ---
${JSON.stringify(formattedHistory, null, 2)}
`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-latest",
      max_tokens: 400,
      system: "You are the Freebox Distinguished Sports Scientist.",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const memoryText = (response.content[0] as any).text;

    return NextResponse.json({ memory: memoryText });

  } catch (error: any) {
    console.error("Error in debrief route:", error);
    return NextResponse.json({ error: error.message || "Failed to generate debrief." }, { status: 500 });
  }
}
