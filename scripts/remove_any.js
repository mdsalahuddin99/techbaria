const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const dir = path.join(process.cwd(), 'app/(dashboard)');
const files = walk(dir);

let count = 0;
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;
  
  // Replace buildCtx(session?.user as any)
  if (content.includes('buildCtx(session?.user as any)')) {
    content = content.replace(/buildCtx\(session\?\.user as any\)/g, 'buildCtx(session?.user)');
    changed = true;
  }
  
  // Replace (session?.user as any)?.role and .id
  if (content.includes('(session?.user as any)?.id')) {
    content = content.replace(/\(session\?\.user as any\)\?\.id/g, 'session?.user?.id');
    changed = true;
  }
  if (content.includes('(session?.user as any)?.role')) {
    content = content.replace(/\(session\?\.user as any\)\?\.role/g, 'session?.user?.role');
    changed = true;
  }

  // Also remove `as any` from initialProducts={productsRes.items as any}
  // Let's do this more broadly: `={(\w+)\.items as any}` -> `={$1.items}`
  const regex = /=\{([a-zA-Z0-9_]+)\.items as any\}/g;
  if (regex.test(content)) {
    content = content.replace(regex, '={$1.items}');
    changed = true;
  }
  
  // Also initialLedger={ledgerRes as any}
  const regex2 = /=\{([a-zA-Z0-9_]+) as any\}/g;
  if (regex2.test(content)) {
    // Only replace if it's a known initial prop passing
    content = content.replace(/initial([A-Za-z]+)=\{([a-zA-Z0-9_]+) as any\}/g, 'initial$1={$2}');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    count++;
    console.log(`Updated ${file}`);
  }
});

console.log(`Updated ${count} files.`);
