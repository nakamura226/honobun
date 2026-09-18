import js from "@eslint/js";
import tseslint from "typescript-eslint";

export const baseConfig = tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    ignores: ["dist/**", ".next/**", "node_modules/**", "coverage/**"],
  },
);

export default baseConfig;
