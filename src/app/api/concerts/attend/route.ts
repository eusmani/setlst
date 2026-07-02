import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET → the current user's attended concerts (also used to show toggle state).
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json([], { status: 401 });
  const rows = await prisma.concertAttendance.findMany({
    where: { userId: session.user.id },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(rows);
}

// POST → toggle attendance for a concert. Body: { externalId, name, venue?, city?, date, image? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { externalId, name, venue, city, date, image } = await req.json();
  if (!externalId || !name || !date) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const existing = await prisma.concertAttendance.findUnique({
    where: { userId_externalId: { userId: session.user.id, externalId: String(externalId) } },
  });
  if (existing) {
    await prisma.concertAttendance.delete({ where: { id: existing.id } });
    return NextResponse.json({ attending: false });
  }
  await prisma.concertAttendance.create({
    data: {
      userId: session.user.id,
      externalId: String(externalId),
      name, venue: venue ?? null, city: city ?? null,
      date: String(date).slice(0, 10), image: image ?? null,
    },
  });
  return NextResponse.json({ attending: true });
}
