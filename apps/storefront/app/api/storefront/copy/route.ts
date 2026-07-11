import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const src = path.join(process.cwd(), 'app/(dashboard)/dashboard/reports/page.tsx');
    const dest = path.join(process.cwd(), 'app/(dashboard)/dashboard/reports/ReportsClient.tsx');
    fs.copyFileSync(src, dest);
    return NextResponse.json({ success: true, src, dest });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
