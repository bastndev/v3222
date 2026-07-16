import { defineConfig } from '@lynx-js/rspeedy'
import { pluginQRCode } from '@lynx-js/qrcode-rsbuild-plugin'
import { pluginReactLynx } from '@lynx-js/react-rsbuild-plugin'
import { pluginTypeCheck } from '@rsbuild/plugin-type-check'
import type { AppConfig } from 'sparkling-app-cli'

const lynxConfig = defineConfig({
  source: {
    entry: {
      main: './src/index.tsx',
    },
  },
  output: {
    assetPrefix: 'asset:///',
    filename: {
      bundle: '[name].lynx.bundle',
    },
  },
  plugins: [
    pluginQRCode({
      schema(url: string): string {
        return `${url}?fullscreen=true`
      },
    }),
    pluginReactLynx(),
    pluginTypeCheck(),
  ],
})

const config: AppConfig = {
  lynxConfig,
  dev: {
    server: {
      port: 5969,
    },
  },
  devtool: true,
  appName: '{{displayName}}',
  platform: {
    android: {
      packageName: '{{packageId}}',
    },
  },
  paths: {
    androidAssets: 'android/app/src/main/assets',
  },
  router: {
    main: {
      path: './lynxPages/main',
    },
  },
}

export default config
