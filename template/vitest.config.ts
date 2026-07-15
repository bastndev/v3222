import { createVitestConfig } from '@lynx-js/react/testing-library/vitest-config'
import { defineConfig, mergeConfig } from 'vitest/config'

const lynxConfig = await createVitestConfig()

export default mergeConfig(
  lynxConfig,
  defineConfig({
    test: {
      include: ['src/**/*.test.tsx'],
    },
  }),
)
