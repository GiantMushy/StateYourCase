// Runs the Android project's Gradle wrapper with the given tasks, on Windows (gradlew.bat via
// cmd) as well as macOS/Linux (./gradlew). Used by `npm run android:release`, whose shell on
// Windows is cmd.exe, where `cd android && ./gradlew` doesn't run.
import { spawnSync } from 'node:child_process'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const cwd = fileURLToPath(new URL('../android/', import.meta.url))
const win = process.platform === 'win32'
// Absolute path: cmd may not look in the current directory (NoDefaultCurrentDirectoryInExePath).
const gradlew = win ? `"${join(cwd, 'gradlew.bat')}"` : './gradlew'
const { status, error } = spawnSync(gradlew, process.argv.slice(2), {
  cwd,
  stdio: 'inherit',
  shell: win,
})
if (error) throw error
process.exit(status ?? 1)
