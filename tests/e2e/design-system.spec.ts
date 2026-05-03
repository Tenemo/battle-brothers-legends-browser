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
    backgroundFitMetricTable: getElementStyle('[data-testid="background-fit-summary-table"]'),
    backgroundFitPanel: getElementStyle('[data-testid="background-fit-panel"]'),
    buildPlannerInfoButton: getElementStyle('[aria-label="Show build planner guidance"]'),
    categorySidebarRailChevron: getElementStyle('[aria-label="Collapse category filters"] svg'),
    detailPanel: getElementStyle('[data-testid="detail-panel"]'),
    detailBadge: getElementStyle(
      '[data-testid="detail-badge"], [data-testid="detail-background-veteran-perk-badge"]',
    ),
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
  await page.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(
    page.getByRole('button', { name: 'Inspect background Apprentice' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Inspect Axe Mastery' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Axe Mastery' })).toBeVisible()
  await page.mouse.move(0, 0)

  const styles = await page.evaluate(getPrimitiveStyleSnapshot)

  expect(styles.perkRow).not.toBeNull()
  expect(styles.backgroundFitCard).not.toBeNull()
  expect(styles.detailBadge).not.toBeNull()
  expect(styles.backgroundFitMetricTable).not.toBeNull()
  expect(styles.perkPlacementChip).not.toBeNull()
  expect(styles.plannerPill).not.toBeNull()
  expect(styles.backgroundFitPanel).not.toBeNull()
  expect(styles.detailPanel).not.toBeNull()
  expect(styles.buildPlannerInfoButton).not.toBeNull()
  expect(styles.plannerActionButton).not.toBeNull()
  expect(styles.backgroundFitRailChevron).not.toBeNull()
  expect(styles.categorySidebarRailChevron).not.toBeNull()
  expect(styles.plannerButtonIcon).not.toBeNull()

  expect(styles.perkRow).toMatchObject({
    backgroundColor: styles.backgroundFitCard?.backgroundColor,
    backgroundImage: styles.backgroundFitCard?.backgroundImage,
    borderColor: styles.backgroundFitCard?.borderColor,
    borderRadius: styles.backgroundFitCard?.borderRadius,
    boxShadow: styles.backgroundFitCard?.boxShadow,
  })
  expect(styles.backgroundFitMetricTable?.width).not.toBe('0px')
  expect(styles.perkPlacementChip?.borderRadius).toBe(styles.plannerPill?.borderRadius)
  expect(styles.perkPlacementChip?.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.plannerPill?.borderColor).not.toBe('rgba(0, 0, 0, 0)')
  expect(styles.buildPlannerInfoButton).toMatchObject({
    backgroundColor: styles.plannerActionButton?.backgroundColor,
    borderColor: styles.plannerActionButton?.borderColor,
  })
  expect(styles.backgroundFitRailChevron).toMatchObject({
    height: styles.categorySidebarRailChevron?.height,
    width: styles.categorySidebarRailChevron?.width,
  })
  expect(Number.parseFloat(styles.categorySidebarRailChevron!.width)).toBeGreaterThan(
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

test('keeps compact desktop controls above the minimum target size', async ({ page }) => {
  await gotoBuildPlanner(page, { height: 720, width: 1280 })
  await searchPerks(page, 'Axe Mastery')
  await addPerkToBuildFromResults(page, 'Axe Mastery')
  await page.getByRole('button', { name: 'Expand background fit' }).click()
  await expect(page.getByRole('button', { name: 'Inspect background Apprentice' })).toBeVisible()

  const targetMetrics = await page.evaluate(() => {
    const selectors = [
      { name: 'search input', selector: '[aria-label="Search perks"]' },
      { name: 'result build toggle', selector: '[aria-label="Remove Axe Mastery from build from results"]' },
      { name: 'clear build', selector: '[data-testid="clear-build-button"]' },
      {
        minimumWidth: 16,
        name: 'category rail',
        selector: '[aria-label="Collapse category filters"]',
      },
      {
        minimumWidth: 16,
        name: 'background fit rail',
        selector: '[aria-label="Collapse background fit"]',
      },
      { name: 'background inspect', selector: '[data-testid="background-fit-card"] button' },
    ]

    return selectors.map(({ minimumWidth = 24, name, selector }) => {
      const element = document.querySelector(selector)

      if (!(element instanceof HTMLElement)) {
        throw new Error(`Missing compact desktop target "${name}".`)
      }

      const rectangle = element.getBoundingClientRect()

      return {
        height: rectangle.height,
        minimumWidth,
        name,
        width: rectangle.width,
      }
    })
  })

  for (const targetMetric of targetMetrics) {
    expect(targetMetric.width, `${targetMetric.name} width`).toBeGreaterThanOrEqual(
      targetMetric.minimumWidth,
    )
    expect(targetMetric.height, `${targetMetric.name} height`).toBeGreaterThanOrEqual(24)
  }
})

test('honours reduced motion for global transitions and animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await gotoBuildPlanner(page, { height: 768, width: 1366 })

  const motionSnapshot = await page.getByTestId('results-panel').evaluate((element) => {
    const style = window.getComputedStyle(element)

    return {
      animationDuration: style.animationDuration,
      scrollBehavior: window.getComputedStyle(document.documentElement).scrollBehavior,
      transitionDuration: style.transitionDuration,
    }
  })

  expect(motionSnapshot).toEqual({
    animationDuration: '0.001s',
    scrollBehavior: 'auto',
    transitionDuration: '0.001s',
  })
})
