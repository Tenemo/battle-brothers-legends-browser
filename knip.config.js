const productionOnlyIgnoredDependencies = [
  '@fontsource/cinzel',
  '@fontsource/source-sans-3',
  'lucide-react',
]

const isProductionAnalysis = process.argv.includes('--production')

export default {
  entry: [
    'netlify/edge-functions/build-seo.ts',
    'scripts/*.mjs',
    'scripts/*.d.mts',
    'tests/**/*.test.ts',
    'tests/**/*.test.tsx',
    'tests/e2e/**/*.spec.ts',
  ],
  ignoreDependencies: isProductionAnalysis ? productionOnlyIgnoredDependencies : [],
  project: [
    'src/**/*.ts',
    'src/**/*.tsx',
    'netlify/**/*.ts',
    'scripts/**/*.mjs',
    'scripts/**/*.mts',
    'tests/**/*.ts',
    'tests/**/*.tsx',
    '*.config.ts',
    '*.config.js',
  ],
}
