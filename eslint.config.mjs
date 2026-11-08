import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "prototypes/**", "supabase/functions/**", "next-env.d.ts", "playwright-report/**", "test-results/**"]),
]);
