/**
 * Fail fast when production API env is missing or unsafe for release APK builds.
 * Run: node scripts/validate-production-api-env.mjs
 */
import { printProductionApiHostname, validateProductionApiEnv } from "./lib/apiConfigEnv.mjs";

try {
  const { base } = validateProductionApiEnv();
  printProductionApiHostname();
  console.log(`Normalized API base path: ${new URL(base).pathname}`);
} catch (err) {
  console.error(`[validate-production-api-env] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}
