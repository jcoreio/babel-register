// TODO: Remove this file in Babel 8

'use strict'

import * as hook from './hook'
import { Options } from './types'
import { LocalClient } from './worker-client'

const client = new LocalClient()
export default function register(opts: Options = {}) {
  return hook.register(client, { ...opts })
}
register.revert = hook.revert
