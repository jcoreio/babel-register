// TODO: Move this file to index.js in Babel 8
import type { IClient, Options } from './types'

const [major, minor] = process.versions.node.split('.').map(Number)

if (major < 12 || (major === 12 && minor < 3)) {
  throw new Error(
    '@babel/register/experimental-worker requires Node.js >= 12.3.0'
  )
}

import hook = require('./hook')
import workerClient = require('./worker-client')

let client: IClient | undefined
export function register(opts?: Options) {
  client ||= new workerClient.WorkerClient()
  hook.register(client, opts)
}

register.revert = hook.revert

if (!require('./is-in-register-worker').isInRegisterWorker) {
  register()
}
