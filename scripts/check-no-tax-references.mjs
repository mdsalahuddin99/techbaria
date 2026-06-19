#!/usr/bin/env node
/**
 * Guard script: fails (exit 1) if any leftover tax/VAT references appear
 * in the repo. Run with `node scripts/check-no-tax-references.mjs`.
 *
 * Matches whole-word `tax`, `taxes`, `taxed`, `taxable`, `taxRate`, `tax_rate`,
 * `vat`, `vat_type`, `vatType`, `vatAmount` (case-insensitive).
 *
 * Allowlisted false positives:
 *   - `taxonomy` (contains "tax")
 *   - `@radix-ui/react-avatar`, `AvatarPrimitive`, etc. (contains "vat" inside "avatar"/"private"/"activate")
 *   - The guard script itself
 *   - Lockfiles, node_modules, dist, build artifacts
 *   - The migration doc's explicit "no tax" / "tax-free" disclaimers
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([
  "node_modules", "dist", "build", ".git", ".next", "coverage",
  ".vite", ".turbo", ".cache",
]);
const SKIP_FILES = new Set([
  "package-lock.json", "bun.lockb", "pnpm-lock.yaml", "yarn.lock",
  "scripts/check-no-tax-references.mjs",
]);
const SCAN_EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
  ".md", ".mdx", ".json", ".prisma", ".sql", ".css", ".html",
]);

// Whole-word-ish patterns. We use lookaround to avoid matching inside other words.
const PATTERNS = [
  /(?<![A-Za-z0-9_])tax(?:es|ed|able|Rate|_rate|Id|_id|Amount)?(?![A-Za-z0-9_])/i,
  /(?<![A-Za-z0-9_])vat(?:_type|Type|_flat|Flat|Amount|_amount|_id|Id)?(?![A-Za-z0-9_])/i,
];

// Per-line allowlist: if the line matches one of these, ignore the hit.
const LINE_ALLOWLIST = [
  /taxonomy/i,
  /\bno tax\b/i,
  /tax-free/i,
  /no `tax`/i,
  /containing `tax`/i,
  /reject .*tax/i,
];

/** @type {{file: string, line: number, text: string}[]} */
const hits = [];

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(entry)) continue;
    if (SKIP_FILES.has(rel)) continue;
    let st;
    try { st = statSync(full); } catch { continue; }
    if (st.isDirectory()) { walk(full); continue; }
    if (!SCAN_EXT.has(extname(entry))) continue;

    let content;
    try { content = readFileSync(full, "utf8"); } catch { continue; }
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!PATTERNS.some((p) => p.test(line))) continue;
      if (LINE_ALLOWLIST.some((p) => p.test(line))) continue;
      hits.push({ file: rel, line: i + 1, text: line.trim().slice(0, 200) });
    }
  }
}

walk(ROOT);

if (hits.length > 0) {
  console.error(`\n❌ Found ${hits.length} leftover tax/VAT reference(s):\n`);
  for (const h of hits) console.error(`  ${h.file}:${h.line}  ${h.text}`);
  console.error(
    "\nIf any of these are legitimate (e.g. the word 'taxonomy' or a 'no tax' disclaimer),\n" +
    "extend LINE_ALLOWLIST in scripts/check-no-tax-references.mjs.\n"
  );
  process.exit(1);
}

console.log("✅ No tax/VAT references found.");
