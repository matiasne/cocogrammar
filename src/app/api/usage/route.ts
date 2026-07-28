import { NextResponse } from "next/server";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

// Lightweight usage snapshot for client-side indicators.
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({
      isSubscribed: user.isSubscribed,
      sentencesUsed: user.sentencesUsed,
      coursesUsed: user.coursesUsed,
    });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("usage route error:", err);
    return NextResponse.json({ error: "Failed to load usage" }, { status: 500 });
  }
}
