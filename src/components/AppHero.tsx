import { plannerVersion } from 'virtual:planner-version'
import { joinClassNames } from '../lib/class-names'
import { GitHubIcon, PersonIcon } from './SharedControls'
import styles from '../App.module.scss'

type AppHeroProps = {
  legendsModRepositoryUrl: string
  modVersion: string
  perkCount: number
  perkGroupCount: number
  personalProjectsUrl: string
  repositoryUrl: string
}

export function AppHero({
  legendsModRepositoryUrl,
  modVersion,
  perkCount,
  perkGroupCount,
  personalProjectsUrl,
  repositoryUrl,
}: AppHeroProps) {
  return (
    <header className={styles.hero} data-testid="hero">
      <div className={styles.heroCopy}>
        <h1>Build planner</h1>
        <a
          aria-label="Open the Battle Brothers Legends mod repository on GitHub"
          className={joinClassNames(styles.eyebrow, styles.heroBrand)}
          href={legendsModRepositoryUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          Battle Brothers{' '}
          <span className={styles.heroBrandEmphasis} data-testid="hero-brand-emphasis">
            Legends
          </span>
        </a>
      </div>
      <div className={styles.heroTopBar}>
        <div className={styles.heroTopActions}>
          <dl className={styles.heroMeta} aria-label="Perk catalog summary">
            <div>
              <dt>Perks</dt>
              <dd>{perkCount}</dd>
            </div>
            <div>
              <dt>Perk groups</dt>
              <dd>{perkGroupCount}</dd>
            </div>
            <div>
              <dt>Mod version</dt>
              <dd>{modVersion}</dd>
            </div>
            <div>
              <dt>Planner version</dt>
              <dd>{plannerVersion}</dd>
            </div>
          </dl>
          <a
            aria-label="Open the build planner repository on GitHub"
            className={styles.heroRepositoryLink}
            href={repositoryUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitHubIcon className={styles.heroRepositoryLinkIcon} />
          </a>
          <a
            aria-label="Open Piotr Piechowski projects"
            className={styles.heroRepositoryLink}
            href={personalProjectsUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <PersonIcon className={styles.heroRepositoryLinkIcon} />
          </a>
        </div>
      </div>
    </header>
  )
}
