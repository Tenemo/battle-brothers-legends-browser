import type { MouseEventHandler } from 'react'
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
  onClick?: MouseEventHandler<HTMLImageElement>
  onMouseEnter?: MouseEventHandler<HTMLImageElement>
  onMouseLeave?: MouseEventHandler<HTMLImageElement>
}

export function AncientScrollPerkGroupMarker({
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AncientScrollPerkGroupMarkerProps) {
  return (
    <img
      alt="Learnable using an ancient scroll"
      className={styles.ancientScrollMarker}
      data-testid={ancientScrollPerkGroupMarkerTestId}
      decoding="async"
      loading="lazy"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
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
