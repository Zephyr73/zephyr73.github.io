import js from '@eslint/js';
import globals from 'globals';

export default [
    {
        ignores: ['_site/**', 'src/assets/js/v3/vendor/**'],
    },
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': 'warn',
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'eqeqeq': 'error',
            'curly': ['error', 'multi-line'],
            'no-undef': 'error',
        },
    },
];
