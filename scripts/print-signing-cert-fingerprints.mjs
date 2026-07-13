/**
 * Print only signing certificate alias, SHA-1, and SHA-256 for the GitHub APK keystore.
 * Never prints passwords, private keys, or keystore binary contents.
 *
 * Run after `expo prebuild` and `ensure-android-release-config.mjs`.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keystorePath = resolve(ROOT, "android/app/debug.keystore");
const buildGradlePath = resolve(ROOT, "android/app/build.gradle");

function readAliasFromGradle() {
  if (!existsSync(buildGradlePath)) {
    return "androiddebugkey";
  }
  const gradle = readFileSync(buildGradlePath, "utf8");
  const match = gradle.match(/keyAlias\s+['"]([^'"]+)['"]/);
  return match?.[1] ?? "androiddebugkey";
}

if (!existsSync(keystorePath)) {
  console.error(
    "[print-signing-cert-fingerprints] android/app/debug.keystore not found — run expo prebuild first"
  );
  process.exit(1);
}

const alias = readAliasFromGradle();

// Standard Android debug keystore credentials (public defaults, already in build.gradle).
// Passed via execFile argv only — never logged.
let output = "";
try {
  output = execFileSync(
    "keytool",
    ["-list", "-v", "-keystore", keystorePath, "-alias", alias, "-storepass", "android", "-keypass", "android"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
  );
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  console.error("[print-signing-cert-fingerprints] keytool failed:", message);
  process.exit(1);
}

console.log("=== APK signing certificate (fingerprints only) ===");
for (const line of output.split("\n")) {
  const trimmed = line.trim();
  if (trimmed.startsWith("Alias name:")) {
    console.log(trimmed);
  } else if (trimmed.startsWith("SHA1:")) {
    console.log(trimmed);
  } else if (trimmed.startsWith("SHA256:")) {
    console.log(trimmed);
  }
}
