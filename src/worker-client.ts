import type { IClient, Options } from './types'

import path = require('node:path')
import types = require('./types')

import ACTIONS = types.ACTIONS

class Client implements IClient {
  #send

  constructor(send: (action: ACTIONS, payload: any) => any) {
    this.#send = send
  }

  #eCache?: string[]
  getDefaultExtensions(): string[] {
    return (this.#eCache ??= this.#send(
      ACTIONS.GET_DEFAULT_EXTENSIONS,
      undefined
    ))
  }

  setOptions(options: Options): void {
    return this.#send(ACTIONS.SET_OPTIONS, options)
  }

  transform(
    code: string,
    filename: string
  ): { code: string; map: object } | null {
    return this.#send(ACTIONS.TRANSFORM, { code, filename })
  }
}

// We need to run Babel in a worker because require hooks must
// run synchronously, but many steps of Babel's config loading
// (which is done for each file) can be asynchronous
export class WorkerClient extends Client {
  // These two require() calls are in deferred so that they are not imported in
  // older Node.js versions (which don't support workers).
  // TODO: Hoist them in Babel 8.

  static get #worker_threads() {
    return require('node:worker_threads') as typeof import('worker_threads')
  }

  static get #markInRegisterWorker() {
    return require('./is-in-register-worker').markInRegisterWorker
  }

  #worker = new WorkerClient.#worker_threads.Worker(
    path.resolve(__dirname, './worker/index'),
    { env: WorkerClient.#markInRegisterWorker(process.env) }
  )

  constructor() {
    super((action, payload) => {
      const subChannel = new WorkerClient.#worker_threads.MessageChannel()

      const signal = new Int32Array(new SharedArrayBuffer(4))
      signal[0] = 0
      this.#worker.postMessage(
        { signal, port: subChannel.port1, action, payload },
        [subChannel.port1]
      )

      Atomics.wait(signal, 0, 0)
      const received = WorkerClient.#worker_threads.receiveMessageOnPort(
        subChannel.port2
      )
      if (!received) {
        throw new Error('failed to get message from worker')
      }
      const message = received.message

      if (message?.error) throw Object.assign(message.error, message.errorData)
      else return message?.result
    })

    // The worker will never exit by itself. Prevent it from keeping
    // the main process alive.
    this.#worker.unref()
  }
}

export class LocalClient extends Client {
  isLocalClient = true

  static #handleMessage?: (action: ACTIONS, payload: any) => any

  constructor() {
    LocalClient.#handleMessage =
      require('./worker/handle-message').handleMessage

    super((action, payload) => {
      return LocalClient.#handleMessage?.(
        action === ACTIONS.TRANSFORM ? ACTIONS.TRANSFORM_SYNC : action,
        payload
      )
    })
  }
}
