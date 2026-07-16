import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const projectRoot = path.resolve(path.dirname(scriptPath), '..')

export async function syncAndroidAssets() {
  const assetsRoot = path.join(projectRoot, 'assets')
  const androidResources = path.join(
    projectRoot,
    'android',
    'app',
    'src',
    'main',
    'res',
  )
  const mappings = [
    ['app-icon.png', 'mipmap-nodpi/v3222_launcher.png'],
    ['app-icon.png', 'mipmap-nodpi/v3222_launcher_round.png'],
    ['splash-logo.png', 'drawable-nodpi/v3222_launcher_foreground.png'],
    ['splash-logo.png', 'drawable-nodpi/v3222_splash_logo.png'],
  ]

  for (const [sourceName, destination] of mappings) {
    const destinationPath = path.join(androidResources, destination)
    await mkdir(path.dirname(destinationPath), { recursive: true })
    await copyFile(path.join(assetsRoot, sourceName), destinationPath)
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  await syncAndroidAssets()
  console.log('Android branding assets synchronized.')
}
