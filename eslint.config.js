import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["fixtures/**", "node_modules/**", "**/dist/**", "test-results/**", "playwright-report/**", "plans/**"] },
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    rules: {
      "no-restricted-globals": ["error", { name: "parseFloat", message: "Money and amounts stay decimal strings." }],
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Model and document text renders as text." },
        { selector: "CallExpression[callee.name='Number']", message: "Never Number() on amounts. Only shared/domain/values.ts may parse number inputs." },
        { selector: "MemberExpression[object.name='Number'][property.name=/^parse/]", message: "Never Number.parse* on amounts. Money stays a decimal string." },
        { selector: "MemberExpression[object.name='globalThis'][property.name='parseFloat']", message: "Money and amounts stay decimal strings." },
        { selector: "NewExpression[callee.name='Number']", message: "Never new Number() on amounts. Money stays a decimal string." },
      ],
    },
  },
  {
    files: ["shared/domain/values.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        { selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']", message: "Model and document text renders as text." },
        { selector: "MemberExpression[object.name='Number'][property.name=/^parse/]", message: "Never Number.parse* on amounts. Money stays a decimal string." },
        { selector: "MemberExpression[object.name='globalThis'][property.name='parseFloat']", message: "Money and amounts stay decimal strings." },
        { selector: "NewExpression[callee.name='Number']", message: "Never new Number() on amounts. Money stays a decimal string." },
      ],
    },
  },
);
