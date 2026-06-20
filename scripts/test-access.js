const fs = require('fs');
const path = require('path');
try {
  const dir = path.join(__dirname, '../src/server/services');
  const files = fs.readdirSync(dir);
  console.log("Services files access success! Found:", files.slice(0, 5));
} catch (err) {
  console.error("Access error:", err.stack);
}
