import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const patterns = [
  [/-\[/, "Tailwind arbitrary value"],
  [/#[0-9a-fA-F]{3,8}\b/, "raw hex colour"],
  [/\b(rgba?|hsla?|oklch)\(/, "raw colour function"],
  [/-\(--/, "Tailwind arbitrary variable"],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (/\.(ts|tsx)$/.test(name)) yield path;
  }
}

let failures = 0;
for (const file of walk("web/src")) {
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [re, what] of patterns)
        if (re.test(line)) {
          console.error(`${file}:${i + 1}: ${what}: ${line.trim()}`);
          failures++;
        }
    });
}
if (failures) process.exit(1);
console.log("Tokens check passed");
