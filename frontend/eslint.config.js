import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // Context files and UI primitives intentionally export both components
      // and hooks/utilities from the same file — this is the standard pattern.
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, checkJS: false },
      ],
      // Suppress the false-positive on intentional reset-to-1 side-effects
      'react-hooks/set-state-in-effect': 'off',
      // react-hooks/incompatible-library is a warning from React Compiler —
      // not an actual bug; suppress until RHF publishes official RC compat.
      'react-hooks/incompatible-library': 'off',
    },
  },
])
