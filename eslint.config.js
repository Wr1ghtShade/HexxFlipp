import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // m9 — bascule vers les règles strictes (vs `recommended` lâche).
      tseslint.configs.strict,
      tseslint.configs.stylistic,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Autoriser le `void` explicite (`void navigator.clipboard.writeText(...)`)
      'no-void': ['error', { allowAsStatement: true }],
      // Permettre `useRef` sans initialiser quand `null` est attendu
      '@typescript-eslint/no-non-null-assertion': 'warn',
    }
  },
])
