const rawBulletMarkerPattern =
  /(?:\u2022|\u00e2\u20ac\u00a2|\u00c3\u00a2\u00e2\u201a\u00ac\u00c2\u00a2)\s*/gu

export function formatDisplayBulletText(text: string): string {
  return text.replace(rawBulletMarkerPattern, '– ')
}
