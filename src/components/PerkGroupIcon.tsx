import type { FocusEventHandler, MouseEventHandler } from 'react'
import {
  ancientScrollIconPath,
  ancientScrollPerkGroupMarkerTestId,
} from '../lib/ancient-scroll-perk-group-display'
import { joinClassNames } from '../lib/class-names'
import { renderGameIcon } from '../lib/perk-display'
import styles from './PerkGroupIcon.module.scss'

type PerkGroupIconProps = {
  className: string
  iconPath: string | null
  label: string
  testId?: string
}

type AncientScrollPerkGroupMarkerProps = {
  className?: string
  onBlur?: FocusEventHandler<HTMLButtonElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  onFocus?: FocusEventHandler<HTMLButtonElement>
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>
}

export function AncientScrollPerkGroupMarker({
  className,
  onBlur,
  onClick,
  onFocus,
  onMouseEnter,
  onMouseLeave,
}: AncientScrollPerkGroupMarkerProps) {
  if (onClick) {
    return (
      <button
        aria-label="Learnable using an ancient scroll"
        className={joinClassNames(styles.ancientScrollMarker, className)}
        data-testid={ancientScrollPerkGroupMarkerTestId}
        onBlur={onBlur}
        onClick={onClick}
        onFocus={onFocus}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        title="Learnable using an ancient scroll"
        type="button"
      >
        <img
          alt=""
          aria-hidden="true"
          className={styles.ancientScrollMarkerIcon}
          decoding="async"
          height="64"
          loading="lazy"
          src={`/game-icons/${ancientScrollIconPath}`}
          width="64"
        />
      </button>
    )
  }

  return (
    <img
      alt="Learnable using an ancient scroll"
      className={joinClassNames(styles.ancientScrollMarker, className)}
      data-testid={ancientScrollPerkGroupMarkerTestId}
      decoding="async"
      height="64"
      loading="lazy"
      src={`/game-icons/${ancientScrollIconPath}`}
      title="Learnable using an ancient scroll"
      width="64"
    />
  )
}

export function PerkGroupIcon({ className, iconPath, label, testId }: PerkGroupIconProps) {
  return renderGameIcon({
    className,
    iconPath,
    label,
    testId,
  })
}
