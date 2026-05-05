import type { ReactNode } from 'react'
import { PlannerInteractionProvider } from '../src/lib/planner-interaction-context'
import type { PlannerInteraction } from '../src/lib/planner-interaction-context-values'
import { createTestPlannerInteraction } from './planner-interaction-test-utils'

export function PlannerInteractionTestProvider({
  children,
  interactionOverrides,
}: {
  children: ReactNode
  interactionOverrides?: Partial<PlannerInteraction>
}) {
  return (
    <PlannerInteractionProvider interaction={createTestPlannerInteraction(interactionOverrides)}>
      {children}
    </PlannerInteractionProvider>
  )
}
