const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, 'apps', 'storefront', 'app');
const storefrontGroupDir = path.join(appDir, '(storefront)');

// The folders that need to be moved inside (storefront) route group
const dirsToMove = [
  'account', 'cart', 'checkout', 'compare', 'order', 
  'p', 'shop', 'track', 'wishlist'
];

console.log("Moving route folders to (storefront)...");

dirsToMove.forEach(d => {
  const src = path.join(appDir, d);
  const dest = path.join(storefrontGroupDir, d);
  
  if (fs.existsSync(src)) {
    fs.renameSync(src, dest);
    console.log(`✅ Moved /${d} to /(storefront)/${d}`);
  }
});

// Move the home page.tsx from /storefront to /(storefront)
const oldHomeDir = path.join(appDir, 'storefront');
const oldHomeFile = path.join(oldHomeDir, 'page.tsx');
const newHomeFile = path.join(storefrontGroupDir, 'page.tsx');

if (fs.existsSync(oldHomeFile)) {
  fs.renameSync(oldHomeFile, newHomeFile);
  console.log(`✅ Moved storefront/page.tsx to (storefront)/page.tsx`);
}

// Delete the old unused root page.tsx and the storefront directory
const rootPageFile = path.join(appDir, 'page.tsx');
if (fs.existsSync(rootPageFile)) {
  fs.rmSync(rootPageFile);
  console.log(`✅ Deleted old root page.tsx`);
}

if (fs.existsSync(oldHomeDir)) {
  fs.rmSync(oldHomeDir, { recursive: true, force: true });
  console.log(`✅ Deleted old storefront directory`);
}

console.log("\n🎉 All routes have been fixed! Next.js will now show Header/Footer on all pages.");
