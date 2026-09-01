import js from '@eslint/js'
import boundaries from 'eslint-plugin-boundaries'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'storybook-static', 'coverage'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      boundaries,
      'jsx-a11y': jsxA11y,
    },
    settings: {
      'boundaries/include': ['src/**/*'],
      'boundaries/elements': [
        { type: 'core', pattern: 'src/core/**' },
        { type: 'infrastructure', pattern: 'src/infrastructure/**' },
        { type: 'presentation', pattern: 'src/presentation/**' },
        { type: 'composition', pattern: 'src/composition/**' },
      ],
    },
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'core' } },
              allow: { to: { element: { type: 'core' } } },
            },
            {
              from: { element: { type: 'infrastructure' } },
              allow: { to: { element: { types: { anyOf: ['core', 'infrastructure'] } } } },
            },
            {
              from: { element: { type: 'presentation' } },
              allow: {
                to: { element: { types: { anyOf: ['core', 'infrastructure', 'presentation'] } } },
              },
            },
            {
              from: { element: { type: 'composition' } },
              allow: {
                to: {
                  element: {
                    types: { anyOf: ['core', 'infrastructure', 'presentation', 'composition'] },
                  },
                },
              },
            },
          ],
        },
      ],
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ['src/core/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['react', 'react-*', '@tanstack/*'],
              message: 'The frontend core must remain framework independent.',
            },
          ],
        },
      ],
    },
  },
)
