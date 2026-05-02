import { type ReactNode, useRef } from 'react'
import { ChevronRight, Funnel, Link, Split, UserRound } from 'lucide-react'
import { joinClassNames } from '../lib/class-names'
import styles from './SharedControls.module.scss'

const railChevronStrokeWidth = 2.6

export type BuildRequirement = 'must-have' | 'optional'

export function ClearableSearchField({
  className = '',
  clearLabel,
  inputId,
  label,
  onValueChange,
  placeholder,
  testId,
  trailingControl,
  value,
}: {
  className?: string
  clearLabel: string
  inputId: string
  label: string
  onValueChange: (nextValue: string) => void
  placeholder: string
  testId?: string
  trailingControl?: ReactNode
  value: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasSearchValue = value.length > 0
  const searchFieldClassName = joinClassNames(styles.searchField, className)

  return (
    <div
      className={searchFieldClassName}
      data-has-clear-button={hasSearchValue}
      data-has-trailing-control={Boolean(trailingControl)}
      data-testid={testId}
    >
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <div className={styles.searchInputControl} data-testid="search-input-control">
        <input
          aria-label={label}
          id={inputId}
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          type="search"
          value={value}
        />
        {hasSearchValue ? (
          <button
            aria-label={clearLabel}
            className={styles.searchClearButton}
            onClick={() => {
              onValueChange('')
              inputRef.current?.focus()
            }}
            type="button"
          >
            <span aria-hidden="true" className={styles.searchClearIcon} />
          </button>
        ) : null}
        {trailingControl ? (
          <span className={styles.searchTrailingControl}>{trailingControl}</span>
        ) : null}
      </div>
    </div>
  )
}

export function GitHubIcon({ className }: { className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 .297a12 12 0 0 0-3.79 23.39c.6.111.82-.26.82-.577v-2.234c-3.338.726-4.042-1.61-4.042-1.61a3.183 3.183 0 0 0-1.336-1.756c-1.092-.746.083-.731.083-.731a2.52 2.52 0 0 1 1.84 1.235 2.548 2.548 0 0 0 3.478.995 2.55 2.55 0 0 1 .76-1.598c-2.665-.303-5.466-1.332-5.466-5.93a4.64 4.64 0 0 1 1.235-3.22 4.3 4.3 0 0 1 .117-3.176s1.008-.322 3.3 1.23a11.47 11.47 0 0 1 6.006 0c2.29-1.552 3.297-1.23 3.297-1.23a4.297 4.297 0 0 1 .12 3.176 4.63 4.63 0 0 1 1.233 3.22c0 4.609-2.806 5.624-5.479 5.921a2.869 2.869 0 0 1 .814 2.228v3.301c0 .319.216.694.825.576A12.004 12.004 0 0 0 12 .297" />
    </svg>
  )
}

export function PersonIcon({ className }: { className: string }) {
  return <UserRound aria-hidden="true" className={className} strokeWidth={1.9} />
}

export function CategoryChevron({
  className,
  isExpanded,
}: {
  className: string
  isExpanded: boolean
}) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={className}
      data-expanded={isExpanded}
      strokeWidth={1.8}
    />
  )
}

export function PlannerSectionChevron({
  className,
  isExpanded,
}: {
  className: string
  isExpanded: boolean
}) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={className}
      data-expanded={isExpanded}
      strokeWidth={1.8}
    />
  )
}

export function BackgroundFitRailChevron({
  className,
  isExpanded,
}: {
  className: string
  isExpanded: boolean
}) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={className}
      data-expanded={isExpanded}
      strokeWidth={railChevronStrokeWidth}
    />
  )
}

export function CategorySidebarRailChevron({
  className,
  isExpanded,
}: {
  className: string
  isExpanded: boolean
}) {
  return (
    <ChevronRight
      aria-hidden="true"
      className={className}
      data-expanded={isExpanded}
      strokeWidth={railChevronStrokeWidth}
    />
  )
}

export function FunnelIcon({
  className,
  isFilled = false,
  testId,
}: {
  className: string
  isFilled?: boolean
  testId?: string
}) {
  return (
    <Funnel
      aria-hidden="true"
      className={className}
      data-testid={testId}
      fill={isFilled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.8}
    />
  )
}

export function BuildRequirementIcon({
  className,
  requirement,
  testId,
}: {
  className?: string
  requirement: BuildRequirement
  testId?: string
}) {
  const iconClassName = joinClassNames(styles.buildRequirementIcon, className)

  return requirement === 'must-have' ? (
    <Link
      aria-hidden="true"
      className={iconClassName}
      data-requirement={requirement}
      data-testid={testId}
      strokeWidth={2}
    />
  ) : (
    <Split
      aria-hidden="true"
      className={iconClassName}
      data-requirement={requirement}
      data-testid={testId}
      strokeWidth={2.1}
    />
  )
}

export function BuildToggleButton({
  className,
  isCompact = false,
  onAddMustHave,
  onAddOptional,
  onRemove,
  pickedRequirement,
  perkName,
  source,
}: {
  className?: string
  isCompact?: boolean
  onAddMustHave: () => void
  onAddOptional: () => void
  onRemove: () => void
  pickedRequirement: BuildRequirement | null
  perkName: string
  source: 'detail' | 'results'
}) {
  const locationSuffix = source === 'results' ? ' from results' : ''

  if (pickedRequirement) {
    const actionLabel = `Remove ${perkName} from build${locationSuffix}`

    return (
      <button
        aria-label={actionLabel}
        aria-pressed="true"
        className={joinClassNames(styles.buildToggleButton, className)}
        data-compact={isCompact}
        data-requirement={pickedRequirement}
        onClick={onRemove}
        title={`Remove ${perkName} from build`}
        type="button"
      >
        <BuildRequirementIcon requirement={pickedRequirement} />
      </button>
    )
  }

  return (
    <span
      className={joinClassNames(styles.buildToggleButtonGroup, className)}
      data-compact={isCompact}
      data-testid="build-toggle-split-button"
    >
      <button
        aria-label={`Add ${perkName} to build${locationSuffix}`}
        className={styles.buildToggleSegment}
        data-requirement="must-have"
        onClick={onAddMustHave}
        title={`Add ${perkName} as must-have`}
        type="button"
      >
        <BuildRequirementIcon requirement="must-have" />
      </button>
      <button
        aria-label={`Add ${perkName} as optional${locationSuffix}`}
        className={styles.buildToggleSegment}
        data-requirement="optional"
        onClick={onAddOptional}
        title={`Add ${perkName} as optional`}
        type="button"
      >
        <BuildRequirementIcon requirement="optional" />
      </button>
    </span>
  )
}
