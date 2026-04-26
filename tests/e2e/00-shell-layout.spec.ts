import { expect, test } from '@playwright/test'
import {
  expectViewportLocked,
  getBuildIndividualGroupsList,
  getBuildPerksBar,
  getBuildSharedGroupsList,
  gotoPerksBrowser,
} from './support/perks-browser'

test('keeps the shell pinned to the viewport with always-visible planner rows', async ({
  page,
}) => {
  await gotoPerksBrowser(page)
  await expectViewportLocked(page)
  const buildPlanner = page.getByLabel('Build planner')

  await expect(page.getByText('No perks picked yet.')).toBeVisible()
  await expect(getBuildPerksBar(page).getByText('Pick a perk to start')).toBeVisible()
  await expect(
    getBuildSharedGroupsList(page).getByText(
      'Perk groups covering 2 or more picked perks will appear here',
    ),
  ).toBeVisible()
  await expect(
    getBuildIndividualGroupsList(page).getByText('Single-perk groups will appear here'),
  ).toBeVisible()
  await expect(buildPlanner.getByText('Perks', { exact: true })).toBeVisible()
  await expect(buildPlanner.getByText('Perk groups for 2+ perks', { exact: true })).toBeVisible()
  await expect(
    buildPlanner.getByText('Perk groups for individual perks', { exact: true }),
  ).toBeVisible()
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const plannerBoard = document.querySelector('.planner-board') as HTMLElement | null

        return plannerBoard === null
          ? Number.POSITIVE_INFINITY
          : plannerBoard.scrollHeight - plannerBoard.clientHeight
      }),
    )
    .toBeLessThanOrEqual(1)
})

test('uses normal page scrolling on mobile while keeping core controls usable', async ({
  page,
}) => {
  await gotoPerksBrowser(page, { height: 740, width: 360 })

  await expect
    .poll(async () =>
      page.evaluate(() => ({
        documentOverflow: window.getComputedStyle(document.documentElement).overflowY,
        documentScrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
      })),
    )
    .toMatchObject({
      documentOverflow: 'auto',
    })

  const scrollableDocumentHeight = await page.evaluate(
    () => document.documentElement.scrollHeight - window.innerHeight,
  )
  expect(scrollableDocumentHeight).toBeGreaterThan(600)

  await page.evaluate(() => window.scrollTo(0, 640))
  await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByLabel('Search perks').fill('student')
  await expect(page.getByRole('button', { name: 'Inspect Student' })).toBeVisible()
  await page.getByRole('button', { name: 'Add Student to build from results' }).click()
  await expect(getBuildPerksBar(page).getByRole('button', { name: 'Remove Student from build' }))
    .toBeVisible()
})
