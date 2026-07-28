import { NextResponse } from "next/server";
import { getHistory } from "@/db/queries";
import { requireUser, unauthorized, UnauthorizedError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const history = await getHistory(user.id);
    return NextResponse.json({ history });
  } catch (err) {
    if (err instanceof UnauthorizedError) return unauthorized();
    console.error("history route error:", err);
    return NextResponse.json({ error: "Failed to load history" }, { status: 500 });
  }
}
