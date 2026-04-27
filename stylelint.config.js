const rawColorPattern = '/#[0-9a-fA-F]{3,8}|\\brgba?\\(|\\bhsla?\\(/'
const rawStylisticLengthPattern = '/(?<![\\w-])-?(?:\\d*\\.\\d+|\\d+)(?:px|rem|em|vh|vw|ms)\\b/'
const nonTokenShadowPattern = '/^(?!none$)(?!var\\(--shadow-).+/'

export default {
  extends: ['stylelint-config-standard'],
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
      files: ['src/styles/tokens.css'],
      rules: {
        'declaration-property-value-disallowed-list': null,
        'function-disallowed-list': null,
      },
    },
  ],
}
