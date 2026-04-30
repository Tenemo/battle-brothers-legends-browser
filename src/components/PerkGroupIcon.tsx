import type { FocusEventHandler, MouseEventHandler } from 'react'
import {
  ancientScrollIconPath,
  ancientScrollPerkGroupMarkerTestId,
} from '../lib/ancient-scroll-perk-group-display'
import { renderGameIcon } from '../lib/perk-display'
import styles from './PerkGroupIcon.module.scss'

type PerkGroupIconProps = {
  className: string
  iconPath: string | null
  label: string
  testId?: string
}

type AncientScrollPerkGroupMarkerProps = {
  onBlur?: FocusEventHandler<HTMLButtonElement>
  onClick?: MouseEventHandler<HTMLButtonElement>
  onFocus?: FocusEventHandler<HTMLButtonElement>
  onMouseEnter?: MouseEventHandler<HTMLButtonElement>
  onMouseLeave?: MouseEventHandler<HTMLButtonElement>
}

export function AncientScrollPerkGroupMarker({
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
        className={styles.ancientScrollMarker}
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
          loading="lazy"
          src={`/game-icons/${ancientScrollIconPath}`}
        />
      </button>
    )
  }

  return (
    <img
      alt="Learnable using an ancient scroll"
      className={styles.ancientScrollMarker}
      data-testid={ancientScrollPerkGroupMarkerTestId}
      decoding="async"
      loading="lazy"
      src={`/game-icons/${ancientScrollIconPath}`}
      title="Learnable using an ancient scroll"
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
