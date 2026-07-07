const { exec } = require("child_process");
const fs = require("fs");

exec("npx eslint . --quiet --format json", { cwd: __dirname }, (error, stdout, stderr) => {
  try {
    const results = JSON.parse(stdout);
    const errorsOnly = results.filter(r => r.errorCount > 0).map(r => {
      return {
        filePath: r.filePath,
        messages: r.messages.filter(m => m.severity === 2)
      };
    });
    fs.writeFileSync("eslint-errors.json", JSON.stringify(errorsOnly, null, 2));
    console.log("Errors written to eslint-errors.json");
  } catch(e) {
    fs.writeFileSync("eslint-errors.txt", stdout || stderr || (error ? error.message : ""));
  }
});
