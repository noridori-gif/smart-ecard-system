import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // eslint-config-next's react-hooks preset bundles the newer "React Compiler"
    // diagnostics (set-state-in-effect, immutability, purity, refs, etc.) as hard
    // errors. This project does not enable the React Compiler (no
    // `experimental.reactCompiler` in next.config.ts), so those compiler-only checks
    // don't reflect anything that actually runs -- and enforcing them as errors would
    // require rewriting most of the app's existing (working) fetch-in-effect data
    // loading pattern for no real runtime benefit. Keep the rules that matter without
    // the compiler (rules-of-hooks, exhaustive-deps come from the base preset above)
    // and downgrade the compiler-only ones to warnings so they stay visible without
    // blocking `next build` / `npm run lint`.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/use-memo": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/config": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/gating": "warn",
      "react-hooks/globals": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
