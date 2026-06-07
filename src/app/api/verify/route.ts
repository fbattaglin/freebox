import { NextResponse } from "next/server";

/**
 * GET /api/verify
 * Lightweight endpoint to validate if the client-side passcode matches the server-side FREEBOX_PASSCODE.
 * Returns { valid: true } on success, or 401 on mismatch.
 * Used for real-time passcode feedback in the settings panel.
 */
export async function GET(request: Request) {
  const passcode = request.headers.get("x-freebox-passcode");
  const requiredPasscode = process.env.FREEBOX_PASSCODE;

  // If no server-side passcode is configured, access is open
  if (!requiredPasscode) {
    return NextResponse.json({ valid: true, mode: "open" });
  }

  if (passcode === requiredPasscode) {
    return NextResponse.json({ valid: true, mode: "secured" });
  }

  return NextResponse.json(
    { valid: false, error: "invalid passcode" },
    { status: 401 }
  );
}
