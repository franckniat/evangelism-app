import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * Le paquet partagé n'a pas de framework : une configuration TypeScript
 * générique suffit, contrairement au backend (AdonisJS) et au mobile (Expo)
 * qui apportent chacun la leur.
 */
export default tseslint.config(
  { ignores: ['dist/*', 'node_modules/*'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  }
)
