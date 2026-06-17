import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default [
  {
    // supabase/functions are Deno edge functions with a different runtime and
    // type story (Deno globals, untyped remote imports) — they're not part of
    // the Vite app build and shouldn't be held to the app's lint rules.
    ignores: ['dist', 'node_modules', 'dev-dist', 'supabase/.temp', 'supabase/functions'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      // Vite fast-refresh DX hint only (no runtime/CI relevance). Several
      // idiomatic files intentionally co-export a component + a hook/variants
      // (auth.tsx, button.tsx, shadcn primitives), so we don't enforce it.
      'react-refresh/only-export-components': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
];
