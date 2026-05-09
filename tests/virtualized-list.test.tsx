import { render, screen } from '@testing-library/react'
import { createContext } from 'react'
import { describe, expect, test, vi } from 'vitest'

vi.mock('react-virtuoso', () => ({
  Virtuoso({
    computeItemKey,
    context,
    data,
    itemContent,
    ...props
  }: {
    computeItemKey: (index: number, item: string | undefined, context: unknown) => string
    context: unknown
    data: string[]
    itemContent: (index: number, item: string | undefined) => React.ReactNode
    [key: string]: unknown
  }) {
    return (
      <div data-testid={String(props['data-testid'])}>
        <span data-testid="missing-item-key">{computeItemKey(4, undefined, context)}</span>
        <span data-testid="missing-item-content">{itemContent(4, undefined) ?? 'empty'}</span>
        {data.map((item, index) => (
          <span data-testid="regular-item" key={computeItemKey(index, item, context)}>
            {itemContent(index, item)}
          </span>
        ))}
      </div>
    )
  },
  VirtuosoMockContext: createContext(null),
}))

import { VirtualizedList } from '../src/components/VirtualizedList'

describe('virtualized list', () => {
  test('ignores transient missing items from the virtualizer', () => {
    render(
      <VirtualizedList
        className="scroll"
        computeItemKey={(_index, item) => item}
        data={['first', 'second']}
        defaultItemHeight={20}
        increaseViewportBy={20}
        initialItemCount={2}
        itemClassName="item"
        itemContent={(_index, item) => item.toUpperCase()}
        listClassName="list"
        minOverscanItemCount={1}
        overscan={20}
        testId="tested-list"
      />,
    )

    expect(screen.getByTestId('missing-item-key')).toHaveTextContent(
      'tested-list-missing-virtualized-item-4',
    )
    expect(screen.getByTestId('missing-item-content')).toHaveTextContent('empty')
    expect(screen.getAllByTestId('regular-item').map((item) => item.textContent)).toEqual([
      'FIRST',
      'SECOND',
    ])
  })
})
