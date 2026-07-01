import { NextResponse } from "next/server";
import { getWeeklyClubs } from "@/lib/clubs";

export const dynamic = "force-dynamic";

// This week's four club picks (Classic, Overlooked, New Release, Throwback).
export async function GET() {
  try {
    return NextResponse.json(await getWeeklyClubs());
  } catch {
    return NextResponse.json([]);
  }
}
