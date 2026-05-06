import { forwardRef, useMemo, type CSSProperties, type ReactNode, type Ref } from 'react'
import {
  Virtuoso,
  VirtuosoMockContext,
  type Components,
  type ContextProp,
  type ComputeItemKey,
  type ListProps,
  type VirtuosoHandle,
} from 'react-virtuoso'

type VirtualizedListContext = {
  emptyPlaceholder: ReactNode
  itemClassName: string
  listClassName: string
}

const VirtualizedListItems = forwardRef<
  HTMLDivElement,
  ListProps & ContextProp<VirtualizedListContext>
>(function VirtualizedListItems({ children, context, ...props }, ref) {
  return (
    <div {...props} className={context.listClassName} ref={ref} role="list">
      {children}
    </div>
  )
})

const virtualizedListComponents: Components<unknown, VirtualizedListContext> = {
  EmptyPlaceholder({ context }) {
    return context.emptyPlaceholder
  },
  Item({ children, context, ...props }) {
    return (
      <div {...props} className={context.itemClassName} role="listitem">
        {children}
      </div>
    )
  },
  List: VirtualizedListItems,
}

const shouldUseMockVirtualizedListMeasurements = import.meta.env.MODE === 'test'

export function VirtualizedList<Item>({
  className,
  isAriaHidden,
  computeItemKey,
  data,
  defaultItemHeight,
  emptyPlaceholder = null,
  heightEstimates,
  increaseViewportBy,
  initialItemCount,
  itemClassName,
  itemContent,
  listClassName,
  minOverscanItemCount,
  onScroll,
  overscan,
  scrollerRef,
  style,
  testId,
  useWindowScroll = false,
  virtuosoRef,
}: {
  className: string
  computeItemKey: ComputeItemKey<Item, VirtualizedListContext>
  data: readonly Item[]
  defaultItemHeight: number
  emptyPlaceholder?: ReactNode
  heightEstimates?: number[]
  increaseViewportBy:
    | number
    | {
        bottom: number
        top: number
      }
  initialItemCount: number
  itemClassName: string
  itemContent: (index: number, item: Item) => ReactNode
  isAriaHidden?: boolean
  listClassName: string
  minOverscanItemCount:
    | number
    | {
        bottom: number
        top: number
      }
  onScroll?: () => void
  overscan:
    | number
    | {
        main: number
        reverse: number
      }
  scrollerRef?: (ref: HTMLElement | null | Window) => void
  style?: CSSProperties
  testId: string
  useWindowScroll?: boolean
  virtuosoRef?: Ref<VirtuosoHandle>
}) {
  const context = useMemo(
    () => ({
      emptyPlaceholder,
      itemClassName,
      listClassName,
    }),
    [emptyPlaceholder, itemClassName, listClassName],
  )
  const effectiveInitialItemCount = Math.min(initialItemCount, data.length)
  const list = (
    <Virtuoso<Item, VirtualizedListContext>
      className={className}
      aria-hidden={isAriaHidden}
      components={virtualizedListComponents as Components<Item, VirtualizedListContext>}
      computeItemKey={computeItemKey}
      context={context}
      data={data}
      data-scroll-container="true"
      data-testid={testId}
      defaultItemHeight={defaultItemHeight}
      heightEstimates={heightEstimates}
      increaseViewportBy={increaseViewportBy}
      initialItemCount={effectiveInitialItemCount}
      itemContent={(index, item) => itemContent(index, item)}
      minOverscanItemCount={minOverscanItemCount}
      onScroll={onScroll}
      overscan={overscan}
      ref={virtuosoRef}
      scrollerRef={scrollerRef}
      style={style}
      useWindowScroll={useWindowScroll}
    />
  )

  if (!shouldUseMockVirtualizedListMeasurements) {
    return list
  }

  return (
    <VirtuosoMockContext.Provider
      value={{
        itemHeight: defaultItemHeight,
        viewportHeight: defaultItemHeight * Math.max(effectiveInitialItemCount, 1),
      }}
    >
      {list}
    </VirtuosoMockContext.Provider>
  )
}
