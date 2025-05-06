import type { MessagePort } from 'node:worker_threads'
import type { ACTIONS } from '../types'

import * as babel from '@babel/core'
import { handleMessage } from './handle-message'

import workerTheads from 'worker_threads'

workerTheads.parentPort?.addListener(
  'message',
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  async ({
    signal,
    port,
    action,
    payload,
  }: {
    signal: Int32Array
    port: MessagePort
    action: ACTIONS
    payload: any
  }) => {
    let response

    try {
      // @ts-expect-error not in type defs
      if (babel.init) await babel.init

      response = { result: await handleMessage(action, payload) }
    } catch (error) {
      response = {
        error,
        errorData: typeof error === 'object' ? { ...error } : undefined,
      }
    }

    try {
      port.postMessage(response)
    } catch {
      port.postMessage({
        error: new Error('Cannot serialize worker response'),
      })
    } finally {
      port.close()
      Atomics.store(signal, 0, 1)
      Atomics.notify(signal, 0)
    }
  }
)
