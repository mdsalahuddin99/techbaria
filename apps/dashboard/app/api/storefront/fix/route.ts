import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function walk(dir: string, fileList: string[] = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      fileList = walk(path.join(dir, file), fileList);
    } else {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

export async function GET() {
  try {
    const files = walk(path.join(process.cwd(), 'app/(dashboard)/dashboard'));
    const pageFiles = files.filter(f => f.endsWith('page.tsx'));
    
    let modified = 0;
    pageFiles.forEach((file) => {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('getInternalCtx')) {
        content = content.replace(/import \{ getInternalCtx \} from ".*internalCtx";/, 'import { auth } from "@/server/auth/config";\nimport { buildCtx } from "@/server/lib/ctx";');
        content = content.replace(/const ctx = getInternalCtx\(\);/, 'const session = await auth();\n  const ctx = buildCtx(session?.user as any);');
        fs.writeFileSync(file, content);
        modified++;
      }
    });

    return NextResponse.json({ success: true, count: modified, files: pageFiles });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.stack || e.message }, { status: 200 });
  }
}
