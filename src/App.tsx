import '@fontsource/cinzel/latin-700.css'
import '@fontsource/source-sans-3/latin-400.css'
import '@fontsource/source-sans-3/latin-600.css'
import '@fontsource/source-sans-3/latin-700.css'
import styles from './App.module.scss'
import { AppHero } from './components/AppHero'
import { PlannerExperience } from './PlannerExperience'
import {
  allPerkGroupCount,
  legendsModRepositoryUrl,
  legendsPerkCatalogDataset,
  personalProjectsUrl,
  repositoryUrl,
} from './app-data'

export default function App() {
  return (
    <div className={styles.appShell} data-testid="app-shell">
      <div className={styles.backgroundRunes} aria-hidden="true" />
      <AppHero
        legendsModRepositoryUrl={legendsModRepositoryUrl}
        modVersion={legendsPerkCatalogDataset.referenceVersion.replace(/^reference-mod_/, '')}
        perkCount={legendsPerkCatalogDataset.perks.length}
        perkGroupCount={allPerkGroupCount}
        personalProjectsUrl={personalProjectsUrl}
        repositoryUrl={repositoryUrl}
      />
      <PlannerExperience />
    </div>
  )
}
