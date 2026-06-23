import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTypescript,
  {
    ignores: [".next/**", "node_modules/**", "public/search-index.json", "材料/**"]
  },
  {
    files: ["scripts/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];

export default config;
