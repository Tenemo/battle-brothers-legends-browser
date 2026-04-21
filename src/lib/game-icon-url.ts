export function getGameIconUrl(iconPath: string | null): string | null {
  return iconPath ? `/game-icons/${iconPath}` : null
}
