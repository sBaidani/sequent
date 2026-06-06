import solidPlugin from "eslint-plugin-solid";

export default [
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      solid: solidPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    rules: {
      ...solidPlugin.configs.recommended.rules,
    }
  }
];
