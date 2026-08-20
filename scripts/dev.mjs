import { spawn } from 'node:child_process'

const processes = [
  ['backend', 'npm', ['run', 'dev:backend']],
  ['student', 'npm', ['run', 'dev:student']],
  ['club', 'npm', ['run', 'dev:club']],
  ['admin', 'npm', ['run', 'dev:admin']],
].map(([name, command, args]) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: process.env,
    detached: process.platform !== 'win32',
  })
  child.on('exit', (code, signal) => {
    if (code && code !== 0) console.error(`${name} exited with code ${code}`)
    if (signal) console.error(`${name} exited after ${signal}`)
  })
  return child
})

let stopping = false
function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of processes) {
    if (child.killed || !child.pid) continue
    try {
      if (process.platform === 'win32') child.kill(signal)
      else process.kill(-child.pid, signal)
    } catch (error) {
      if (error.code !== 'ESRCH') console.error(`Could not stop process ${child.pid}:`, error.message)
    }
  }
  setTimeout(() => process.exit(0), 300).unref()
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
process.on('exit', () => {
  for (const child of processes) {
    if (child.killed || !child.pid) continue
    try {
      if (process.platform === 'win32') child.kill('SIGTERM')
      else process.kill(-child.pid, 'SIGTERM')
    } catch {
      // The process group may already have exited normally.
    }
  }
})
