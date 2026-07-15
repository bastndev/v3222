import { getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { expect, test } from 'vitest'

import { App } from './App.js'

test('renders the generated app name', async () => {
  render(<App />)

  const { findByText } = getQueriesForElement(elementTree.root!)
  expect(await findByText('{{displayName}}')).toBeTruthy()
})
