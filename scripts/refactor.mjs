import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const dirsToScan = ['./src', './app', './prisma'];
let allFiles = [];
dirsToScan.forEach(d => {
  allFiles = allFiles.concat(walk(d));
});

let updatedCount = 0;

for (const file of allFiles) {
  if (file.includes('schema.prisma')) continue;
  
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Replace isolated string checks
  content = content.replace(/"SUPER_ADMIN"/g, '"ADMIN"');
  content = content.replace(/"OWNER"/g, '"ADMIN"');
  content = content.replace(/"MANAGER"/g, '"ADMIN"');

  // Clean up duplicate ["ADMIN", "ADMIN"] that might have formed from ["OWNER", "MANAGER"]
  content = content.replace(/\[\s*"ADMIN"\s*,\s*"ADMIN"\s*,\s*"ADMIN"\s*\]/g, '["ADMIN"]');
  content = content.replace(/\[\s*"ADMIN"\s*,\s*"ADMIN"\s*\]/g, '["ADMIN"]');
  content = content.replace(/\[\s*"ADMIN"\s*,\s*"ADMIN"\s*,\s*"CASHIER"\s*\]/g, '["ADMIN", "CASHIER"]');
  content = content.replace(/\[\s*"ADMIN"\s*,\s*"ADMIN"\s*,\s*"ADMIN"\s*,\s*"CASHIER"\s*\]/g, '["ADMIN", "CASHIER"]');
  content = content.replace(/\[\s*"ADMIN"\s*,\s*"ADMIN"\s*,\s*"CASHIER"\s*,\s*"VIEWER"\s*\]/g, '["ADMIN", "CASHIER", "VIEWER"]');

  // Also clean up Set deduplication if any `new Set(["ADMIN", "ADMIN"])`
  
  if (file.endsWith('rbac.ts')) {
    // Fix the Role type definition
    content = content.replace(/type Role = "ADMIN" \| "ADMIN" \| "ADMIN" \| "ADMIN" \| "CASHIER" \| "VIEWER";/, 'type Role = "ADMIN" | "CASHIER" | "VIEWER";');
    content = content.replace(/type Role = "ADMIN" \| "ADMIN" \| "ADMIN" \| "CASHIER" \| "VIEWER";/, 'type Role = "ADMIN" | "CASHIER" | "VIEWER";');
    
    // Re-write the HIERARCHY object
    content = content.replace(/const HIERARCHY: Record<Role, number> = {[\s\S]*?};/, `const HIERARCHY: Record<Role, number> = {
  ADMIN: 3,
  CASHIER: 2,
  VIEWER: 1,
};`);
  }

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    updatedCount++;
    console.log('Updated:', file);
  }
}

console.log(`Refactored ${updatedCount} files.`);
