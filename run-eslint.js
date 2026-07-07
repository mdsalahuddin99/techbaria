const { exec } = require("child_process");
const fs = require("fs");

exec("npx eslint . --quiet", { cwd: __dirname }, (error, stdout, stderr) => {
  fs.writeFileSync("eslint-errors.txt", stdout || stderr || (error ? error.message : ""));
});
