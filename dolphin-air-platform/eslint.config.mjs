import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextPlugin from '@next/eslint-plugin-next';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
import { fileURLToPath } from 'node:url';

const portalRoot = fileURLToPath(new URL('./apps/portal/', import.meta.url));

export default defineConfig([
  globalIgnores([
    '**/node_modules/**',
    '**/.next/**',
    '**/dist/**',
    '**/src/generated/prisma/**',
    '**/build/**',
    '**/.turbo/**',
    '**/coverage/**',
    '**/*.tsbuildinfo',
    '**/next-env.d.ts',
  ]),
  {
    files: ['prisma.config.ts', 'apps/**/*.{ts,tsx}', 'packages/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  {
    files: ['apps/crm/src/**/*.{ts,tsx}', 'packages/ui/src/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['apps/portal/src/**/*.{ts,tsx}'],
    plugins: { react, 'react-hooks': reactHooks, '@next/next': nextPlugin },
    settings: {
      react: { version: 'detect' },
      next: { rootDir: portalRoot },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
  },
  {
    files: ['eslint.config.mjs'],
    plugins: { '@next/next': nextPlugin },
    rules: { ...nextPlugin.configs.recommended.rules },
  },
]);
