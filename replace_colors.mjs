import fs from 'fs';
import path from 'path';

const REPLACEMENTS = [
  { search: /#2563EB/ig, replace: '#16A34A' },
  { search: /#1D4ED8/ig, replace: '#15803D' },
  { search: /#3B82F6/ig, replace: '#22C55E' },
  { search: /#EFF6FF/ig, replace: '#F0FDF4' },
  { search: /#1E40AF/ig, replace: '#166534' },
  { search: /shadow-blue-/g, replace: 'shadow-green-' },
  { search: /text-blue-/g, replace: 'text-green-' },
  { search: /bg-blue-/g, replace: 'bg-green-' },
  { search: /border-blue-/g, replace: 'border-green-' },
  { search: /ring-blue-/g, replace: 'ring-green-' }
];

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walkDir(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
      results.push(filePath);
    }
  });
  return results;
}

const dirsToProcess = ['app', 'src'];
let changedFiles = 0;

dirsToProcess.forEach(dir => {
  const files = walkDir(dir);
  files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    
    REPLACEMENTS.forEach(({ search, replace }) => {
      content = content.replace(search, replace);
    });

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
      changedFiles++;
      console.log(`Updated ${file}`);
    }
  });
});

console.log(`\nSuccessfully updated colors in ${changedFiles} files.`);
