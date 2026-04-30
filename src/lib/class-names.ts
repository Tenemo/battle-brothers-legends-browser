export function joinClassNames(...classNames: Array<false | null | string | undefined>): string {
  return classNames.filter((className): className is string => Boolean(className)).join(' ')
}
