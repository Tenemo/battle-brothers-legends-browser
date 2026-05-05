import type { FocusEventHandler, MouseEventHandler } from 'react'
import {
  ancientScrollIconPath,
  ancientScrollPerkGroupMarkerTestId,
} from '../lib/ancient-scroll-perk-group-display'
import { joinClassNames } from '../lib/class-names'
import {
  gameIconImageWidths,
  getGameIconSrcSet,
  getGameIconUrl,
  type GameIconImageWidth,
} from '../lib/game-icon-url'
import { renderGameIcon } from '../lib/perk-display'
import styles from './PerkGroupIcon.module.scss'

type PerkGroupIconProps = {
  className: string
  imageWidth?: GameIconImageWidth
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
  const ancientScrollIconUrl = getGameIconUrl(ancientScrollIconPath, gameIconImageWidths.compact)

  if (!ancientScrollIconUrl) {
    return null
  }

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
          height={gameIconImageWidths.compact}
          loading="lazy"
          src={ancientScrollIconUrl}
          srcSet={getGameIconSrcSet(ancientScrollIconPath, gameIconImageWidths.compact)}
          width={gameIconImageWidths.compact}
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
      height={gameIconImageWidths.compact}
      loading="lazy"
      src={ancientScrollIconUrl}
      srcSet={getGameIconSrcSet(ancientScrollIconPath, gameIconImageWidths.compact)}
      title="Learnable using an ancient scroll"
      width={gameIconImageWidths.compact}
    />
  )
}

export function PerkGroupIcon({
  className,
  imageWidth = gameIconImageWidths.compact,
  iconPath,
  label,
  testId,
}: PerkGroupIconProps) {
  return renderGameIcon({
    className,
    imageWidth,
    iconPath,
    label,
    testId,
  })
}
