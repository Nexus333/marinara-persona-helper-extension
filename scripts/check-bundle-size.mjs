import { statSync } from "node:fs";

const [, , filePath, maxBytesArg = "2097152"] = process.argv;

if (!filePath) {
  console.error("Usage: node scripts/check-bundle-size.mjs <file> [maxBytes]");
  process.exit(1);
}

const maxBytes = Number(maxBytesArg);
if (!Number.isInteger(maxBytes) || maxBytes <= 0) {
  console.error(`Invalid max byte limit: ${maxBytesArg}`);
  process.exit(1);
}

const size = statSync(filePath).size;
const percent = ((size / maxBytes) * 100).toFixed(1);

console.log(`${filePath}: ${size} bytes (${percent}% of ${maxBytes})`);

if (size > maxBytes) {
  console.error(`Bundle exceeds Marinara personal extension text-entry limit of ${maxBytes} bytes.`);
  process.exit(1);
}
