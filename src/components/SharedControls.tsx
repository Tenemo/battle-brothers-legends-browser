import { type ReactNode, useRef } from 'react'

export function ClearableSearchField({
  className = '',
  clearLabel,
  inputId,
  label,
  onValueChange,
  placeholder,
  trailingControl,
  value,
}: {
  className?: string
  clearLabel: string
  inputId: string
  label: string
  onValueChange: (nextValue: string) => void
  placeholder: string
  trailingControl?: ReactNode
  value: string
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const hasSearchValue = value.length > 0
  const searchFieldClassName = [
    'search-field',
    className,
    trailingControl ? 'has-trailing-control' : '',
    hasSearchValue ? 'has-clear-button' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={searchFieldClassName}>
      <label className="visually-hidden" htmlFor={inputId}>
        {label}
      </label>
      <div className="search-input-control">
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
            className="search-clear-button"
            onClick={() => {
              onValueChange('')
              inputRef.current?.focus()
            }}
            type="button"
          >
            <span aria-hidden="true" className="search-clear-icon" />
          </button>
        ) : null}
        {trailingControl ? (
          <span className="search-trailing-control">{trailingControl}</span>
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

export function CategoryChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'category-chevron is-expanded' : 'category-chevron'}
      viewBox="0 0 12 12"
    >
      <path
        d="M4 2.5 7.5 6 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function BackgroundFitRailChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        isExpanded ? 'background-fit-rail-chevron is-expanded' : 'background-fit-rail-chevron'
      }
      viewBox="0 0 12 12"
    >
      <path
        d="M4 2.5 7.5 6 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function DetailPanelRailChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isExpanded ? 'detail-panel-rail-chevron is-expanded' : 'detail-panel-rail-chevron'}
      viewBox="0 0 12 12"
    >
      <path
        d="M4 2.5 7.5 6 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function FunnelIcon({
  className,
  isFilled = false,
}: {
  className: string
  isFilled?: boolean
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill={isFilled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
    >
      <path d="M4 5h16l-6.1 7.1v5.1l-3.8 1.8v-6.9L4 5Z" />
    </svg>
  )
}

export function BackgroundFitAccordionChevron({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={
        isExpanded
          ? 'background-fit-accordion-chevron is-expanded'
          : 'background-fit-accordion-chevron'
      }
      viewBox="0 0 12 12"
    >
      <path
        d="M4 2.5 7.5 6 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  )
}

export function BuildStar({ isPicked }: { isPicked: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={isPicked ? 'build-star is-picked' : 'build-star'}
      viewBox="0 0 24 24"
    >
      <path
        d="m12 3.45 2.67 5.41 5.97.87-4.32 4.21 1.02 5.95L12 17.07 6.66 19.89l1.02-5.95-4.32-4.21 5.97-.87L12 3.45Z"
        fill={isPicked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

export function BuildToggleButton({
  isCompact = false,
  isPicked,
  onClick,
  perkName,
  source,
}: {
  isCompact?: boolean
  isPicked: boolean
  onClick: () => void
  perkName: string
  source: 'detail' | 'results'
}) {
  const locationSuffix = source === 'results' ? ' from results' : ''
  const actionLabel = isPicked
    ? `Remove ${perkName} from build${locationSuffix}`
    : `Add ${perkName} to build${locationSuffix}`
  const titleLabel = isPicked ? `Remove ${perkName} from build` : `Add ${perkName} to build`

  return (
    <button
      aria-label={actionLabel}
      aria-pressed={isPicked}
      className={
        isCompact
          ? isPicked
            ? 'build-toggle-button is-compact is-picked'
            : 'build-toggle-button is-compact'
          : isPicked
            ? 'build-toggle-button is-picked'
            : 'build-toggle-button'
      }
      onClick={onClick}
      title={titleLabel}
      type="button"
    >
      <BuildStar isPicked={isPicked} />
    </button>
  )
}
