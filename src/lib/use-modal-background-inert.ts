import { useEffect, type RefObject } from 'react'

type ModalBackgroundElementState = {
  ariaHidden: string | null
  element: HTMLElement
  hadInert: boolean
}

export function useModalBackgroundInert(backdropRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const backdropElement = backdropRef.current
    const containerElement = backdropElement?.parentElement

    if (!backdropElement || !containerElement) {
      return
    }

    const backgroundElementStates: ModalBackgroundElementState[] = Array.from(
      containerElement.children,
    )
      .filter(
        (element): element is HTMLElement =>
          element instanceof HTMLElement && element !== backdropElement,
      )
      .map((element) => ({
        ariaHidden: element.getAttribute('aria-hidden'),
        element,
        hadInert: element.hasAttribute('inert'),
      }))

    for (const { element } of backgroundElementStates) {
      element.setAttribute('aria-hidden', 'true')
      element.setAttribute('inert', '')
    }

    return () => {
      for (const { ariaHidden, element, hadInert } of backgroundElementStates) {
        if (ariaHidden === null) {
          element.removeAttribute('aria-hidden')
        } else {
          element.setAttribute('aria-hidden', ariaHidden)
        }

        if (!hadInert) {
          element.removeAttribute('inert')
        }
      }
    }
  }, [backdropRef])
}
