/*
 * ESLint for the frontend.
 *
 * The rules here were already right; what was wrong was what they ran on.
 * `npm run lint` was `eslint .`, and on ESLint 8 with an .eslintrc config a
 * bare directory only picks up `.js` files. So the run covered the 50 files
 * under hooks, utils, services and config, and not one `.jsx` — every
 * component and every page in the project was invisible to it.
 *
 * `eslint:recommended` turns on `no-undef`, which is the rule that would have
 * stopped four pages shipping with a ReferenceError on their first render
 * (#365, #366, #367). The script carries `--ext .js,.jsx` now, and CI runs
 * it. See #368.
 */
module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: ['react'],
  rules: {
    'react/prop-types': 'off',

    /*
     * A warning, not an error, so it does not gate CI.
     *
     * There are 57 of them today, mostly unused imports left by earlier
     * refactors. They are worth clearing, but clearing them is a change of
     * its own — turning them into errors now would mean either a large
     * unrelated diff or a suppression, and neither is what this gate is for.
     */
    'no-unused-vars': 'warn',

    /*
     * Off, deliberately.
     *
     * It fires 45 times across the three policy pages, every one of them on a
     * literal " or ' inside a paragraph of prose. React renders those
     * correctly; the rule exists for JSX written by hand where a stray quote
     * might have been meant as a delimiter, which is not what a terms-of-
     * service page is. Escaping them all would make the source of that prose
     * unreadable to keep a linter quiet.
     */
    'react/no-unescaped-entities': 'off',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
};
