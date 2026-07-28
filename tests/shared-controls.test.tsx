import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { BuildRequirementIcon, type BuildRequirement } from '../src/components/SharedControls'

describe('build requirement icon', () => {
  test.each<{
    expectedIconClassName: string
    requirement: BuildRequirement
  }>([
    { expectedIconClassName: 'lucide-link', requirement: 'must-have' },
    { expectedIconClassName: 'lucide-split', requirement: 'optional' },
  ])(
    'renders the intended marker for $requirement requirements',
    ({ expectedIconClassName, requirement }) => {
      render(<BuildRequirementIcon requirement={requirement} testId="requirement-icon" />)

      const requirementIcon = screen.getByTestId('requirement-icon')

      expect(requirementIcon).toHaveClass(expectedIconClassName)
      expect(requirementIcon).toHaveAttribute('aria-hidden', 'true')
      expect(requirementIcon).toHaveAttribute('data-requirement', requirement)
    },
  )
})
