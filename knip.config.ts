const productionOnlyIgnoredDependencies = [
  '@fontsource/cinzel',
  '@fontsource/source-sans-3',
  'lucide-react',
  'react-virtuoso',
]

const isProductionAnalysis = process.argv.includes('--production')

export default {
  entry: [
    'netlify/edge-functions/build-seo.ts',
    'src/entry-server.tsx',
    'src/types/virtual-modules.d.ts',
    'scripts/*.ts',
    'tests/**/*.test.ts',
    'tests/**/*.test.tsx',
    'tests/e2e/**/*.spec.ts',
  ],
  ignoreDependencies: isProductionAnalysis ? productionOnlyIgnoredDependencies : [],
  project: [
    'src/**/*.ts',
    'src/**/*.tsx',
    'netlify/**/*.ts',
    'scripts/**/*.ts',
    'tests/**/*.ts',
    'tests/**/*.tsx',
    '*.config.ts',
  ],
}
