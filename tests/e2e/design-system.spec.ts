import { expect, test, type Page } from '@playwright/test'
import { addPerkToBuildFromResults, gotoPerksBrowser, searchPerks } from './support/perks-browser'

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
    backgroundFitCard: getElementStyle('.background-fit-card'),
    backgroundFitMetricBadge: getElementStyle('.background-fit-metric-badge'),
    backgroundFitPanel: getElementStyle('.background-fit-panel'),
    buildPlannerInfoButton: getElementStyle('.build-planner-info-button'),
    detailPanelRailChevron: getElementStyle('.detail-panel-rail-chevron'),
    detailPanel: getElementStyle('.detail-panel'),
    detailBadge: getElementStyle('.detail-panel .detail-badge'),
    perkPlacementChip: getElementStyle('.perk-placement-chip'),
    perkRow: getElementStyle('.perk-row:not(.is-picked):not(.is-selected)'),
    plannerActionButton: getElementStyle('.planner-action-button'),
    plannerButtonIcon: getElementStyle('.planner-button-icon'),
    plannerPill: getElementStyle('.planner-pill'),
  }
}

async function getResolvedCssBorderColor(page: Page, cssBorderColorValue: string) {
  return page.evaluate((borderColorValue) => {
    const colorProbe = document.createElement('div')
    colorProbe.style.borderColor = borderColorValue
    document.body.append(colorProbe)
    const resolvedColor = window.getComputedStyle(colorProbe).borderTopColor

    colorProbe.remove()

    return resolvedColor
  }, cssBorderColorValue)
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
  expect(styles.buildPlannerInfoButton).not.toBeNull()
  expect(styles.plannerActionButton).not.toBeNull()
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
  expect(styles.plannerButtonIcon).toMatchObject({
    height: styles.detailPanelRailChevron?.height,
    width: styles.detailPanelRailChevron?.width,
  })
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
    outlineStyle: 'none',
    outlineWidth: '0px',
  })
})
