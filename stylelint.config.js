const rawColorPattern = '/#[0-9a-fA-F]{3,8}|\\brgba?\\(|\\bhsla?\\(/'
const rawStylisticLengthPattern = '/(?<![\\w-])-?(?:\\d*\\.\\d+|\\d+)(?:px|rem|em|vh|vw|ms)\\b/'
const shadowTokenValuePattern = 'var\\(--shadow-[a-zA-Z0-9_-]+\\)'
const nonTokenShadowPattern = `/^(?!none$)(?!${shadowTokenValuePattern}(?:,\\s*${shadowTokenValuePattern})*$).+/`

export default {
  extends: ['stylelint-config-standard-scss'],
  ignoreFiles: ['dist/**', 'node_modules/**', 'test-results/**', 'coverage/**', '.netlify/**'],
  rules: {
    'alpha-value-notation': 'number',
    'color-function-notation': 'modern',
    'custom-property-pattern': null,
    'declaration-property-value-disallowed-list': {
      '/.*/': [rawColorPattern, rawStylisticLengthPattern],
      'box-shadow': [nonTokenShadowPattern],
      'z-index': ['/^-?\\d+$/'],
    },
    'function-disallowed-list': ['rgba', 'rgb', 'hsl', 'hsla'],
    'keyframes-name-pattern': null,
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'selector-class-pattern': null,
  },
  overrides: [
    {
      files: ['src/styles/tokens.scss'],
      rules: {
        'declaration-property-value-disallowed-list': null,
        'function-disallowed-list': null,
      },
    },
  ],
}
