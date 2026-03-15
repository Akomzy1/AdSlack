import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const result = await db.$queryRaw`SELECT 1 as ok`;
    const userCount = await db.user.count();
    return NextResponse.json({ connected: true, userCount });
  } catch (err: any) {
    return NextResponse.json({ connected: false, error: err.message }, { status: 500 });
  }
}
