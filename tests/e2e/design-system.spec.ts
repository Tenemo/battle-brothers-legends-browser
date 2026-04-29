import { expect, test } from '@playwright/test'
import {
  addPerkToBuildFromResults,
  getResolvedCssBorderColor,
  gotoBuildPlanner,
  searchPerks,
} from './support/build-planner-page'

function getPrimitiveStyleSnapshot() {
  function getElementStyle(selector: string) {
    const element = document.querySelector(selector)

    if (!(element instanceof Element)) {
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
      height: style.height,
      width: style.width,
    }
  }

  return {
    backgroundFitCard: getElementStyle('[data-testid="background-fit-card"]'),
    backgroundFitMetricBadge: getElementStyle('[data-testid="background-fit-summary-badge"]'),
    backgroundFitPanel: getElementStyle('[data-testid="background-fit-panel"]'),
    buildPlannerInfoButton: getElementStyle('[aria-label="Show build planner guidance"]'),
    detailPanelRailChevron: getElementStyle('[aria-label="Collapse perk details"] svg'),
    detailPanel: getElementStyle('[data-testid="perk-detail-panel"]'),
    detailBadge: getElementStyle('[data-testid="detail-badge"]'),
    perkPlacementChip: getElementStyle('[data-testid="perk-placement-chip"]'),
    perkRow: getElementStyle(
      '[data-testid="perk-row"][data-picked="false"][data-selected="false"]',
    ),
    backgroundFitRailChevron: getElementStyle(
      '[aria-label="Expand background fit"] svg, [aria-label="Collapse background fit"] svg',
    ),
    plannerActionButton: getElementStyle('[data-testid="clear-build-button"]'),
    plannerButtonIcon: getElementStyle('[data-testid="clear-build-button"] svg'),
    plannerPill: getElementStyle('[data-testid="planner-pill"]'),
  }
}

test('keeps repeated surfaces aligned through shared design primitives', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 768, width: 1366 })
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
  expect(styles.buildPlannerInfoButton).not.toBeNull()
  expect(styles.plannerActionButton).not.toBeNull()
  expect(styles.backgroundFitRailChevron).not.toBeNull()
  expect(styles.detailPanelRailChevron).not.toBeNull()
  expect(styles.plannerButtonIcon).not.toBeNull()

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
  expect(styles.buildPlannerInfoButton).toMatchObject({
    backgroundColor: styles.plannerActionButton?.backgroundColor,
    borderColor: styles.plannerActionButton?.borderColor,
  })
  expect(styles.backgroundFitRailChevron).toMatchObject({
    height: styles.detailPanelRailChevron?.height,
    width: styles.detailPanelRailChevron?.width,
  })
  expect(Number.parseFloat(styles.detailPanelRailChevron!.width)).toBeGreaterThan(
    Number.parseFloat(styles.plannerButtonIcon!.width),
  )
  expect(styles.backgroundFitPanel).toMatchObject({
    borderRadius: styles.detailPanel?.borderRadius,
    boxShadow: styles.detailPanel?.boxShadow,
  })

  const strongBorderColor = await getResolvedCssBorderColor(page, 'var(--border-strong)')
  const perkSearchInput = page.getByLabel('Search perks')

  await perkSearchInput.focus()

  const focusedSearchInputStyle = await perkSearchInput.evaluate((element) => {
    const computedStyle = window.getComputedStyle(element)

    return {
      borderColor: computedStyle.borderTopColor,
      outlineStyle: computedStyle.outlineStyle,
      outlineWidth: computedStyle.outlineWidth,
    }
  })

  expect(focusedSearchInputStyle).toEqual({
    borderColor: strongBorderColor,
    outlineStyle: 'solid',
    outlineWidth: '2px',
  })
})
