import { expect, test } from '@playwright/test'
import { addPerkToBuildFromResults, gotoPerksBrowser, searchPerks } from './support/perks-browser'

function getPrimitiveStyleSnapshot() {
  function getElementStyle(selector: string) {
    const element = document.querySelector(selector)

    if (!(element instanceof HTMLElement)) {
      return null
    }

    const style = window.getComputedStyle(element)

    return {
      backgroundColor: style.backgroundColor,
      backgroundImage: style.backgroundImage,
      borderColor: style.borderTopColor,
      borderRadius: style.borderTopLeftRadius,
      boxShadow: style.boxShadow,
      color: style.color,
    }
  }

  return {
    backgroundFitCard: getElementStyle('.background-fit-card'),
    backgroundFitMetricBadge: getElementStyle('.background-fit-metric-badge'),
    backgroundFitPanel: getElementStyle('.background-fit-panel'),
    detailPanel: getElementStyle('.detail-panel'),
    detailBadge: getElementStyle('.detail-panel .detail-badge'),
    perkPlacementChip: getElementStyle('.perk-placement-chip'),
    perkRow: getElementStyle('.perk-row:not(.is-picked):not(.is-selected)'),
    plannerPill: getElementStyle('.planner-pill'),
  }
}

test('keeps repeated surfaces aligned through shared design primitives', async ({ page }) => {
  await gotoPerksBrowser(page, { height: 768, width: 1366 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')
  await page.mouse.move(0, 0)

  const styles = await page.evaluate(getPrimitiveStyleSnapshot)

  expect(styles.perkRow).not.toBeNull()
  expect(styles.backgroundFitCard).not.toBeNull()
  expect(styles.detailBadge).not.toBeNull()
  expect(styles.backgroundFitMetricBadge).not.toBeNull()
  expect(styles.perkPlacementChip).not.toBeNull()
  expect(styles.plannerPill).not.toBeNull()
  expect(styles.backgroundFitPanel).not.toBeNull()
  expect(styles.detailPanel).not.toBeNull()

  expect(styles.perkRow).toMatchObject({
    backgroundColor: styles.backgroundFitCard?.backgroundColor,
    backgroundImage: styles.backgroundFitCard?.backgroundImage,
    borderColor: styles.backgroundFitCard?.borderColor,
    borderRadius: styles.backgroundFitCard?.borderRadius,
    boxShadow: styles.backgroundFitCard?.boxShadow,
  })
  expect(styles.detailBadge).toMatchObject({
    backgroundColor: styles.backgroundFitMetricBadge?.backgroundColor,
    borderColor: styles.backgroundFitMetricBadge?.borderColor,
    borderRadius: styles.backgroundFitMetricBadge?.borderRadius,
    color: styles.backgroundFitMetricBadge?.color,
  })
  expect(styles.perkPlacementChip?.borderRadius).toBe(styles.plannerPill?.borderRadius)
  expect(styles.perkPlacementChip?.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.plannerPill?.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.backgroundFitPanel).toMatchObject({
    borderRadius: styles.detailPanel?.borderRadius,
    boxShadow: styles.detailPanel?.boxShadow,
  })
})
