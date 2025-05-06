import type { IClient, Options } from './types'

import pirates = require('pirates')
import sourceMapSupport from 'source-map-support'

let piratesRevert: (() => void) | undefined
const maps = Object.create(null)

function installSourceMapSupport() {
  // @ts-expect-error assign to function
  installSourceMapSupport = () => {}

  sourceMapSupport.install({
    handleUncaughtExceptions: false,
    environment: 'node',
    // @ts-expect-error original code defies TS types
    retrieveSourceMap(filename: string) {
      const map = maps?.[filename]
      if (map) {
        return { url: null, map }
      } else {
        return null
      }
    },
  })
}

import Module from 'node:module'

// Babel 7 compiles files in the same thread where it hooks `require()`,
// so we must prevent mixing Babel plugin dependencies with the files
// to be compiled.
// All the `!process.env.BABEL_8_BREAKING` code in this file is for
// this purpose.

let compiling = false
// @ts-expect-error no type defs
const internalModuleCache = Module._cache

function compileBabel7(client: IClient, code: string, filename: string) {
  // @ts-expect-error Babel 7 property
  if (!client.isLocalClient) return compile(client, code, filename)

  if (compiling) return code

  // @ts-expect-error no type defs
  const globalModuleCache = Module._cache
  try {
    compiling = true
    // @ts-expect-error no type defs
    Module._cache = internalModuleCache
    return compile(client, code, filename)
  } finally {
    compiling = false
    // @ts-expect-error no type defs
    Module._cache = globalModuleCache
  }
}

function compile(client: IClient, inputCode: string, filename: string) {
  const result = client.transform(inputCode, filename)

  if (result === null) return inputCode

  const { code, map } = result
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (map) {
    maps[filename] = map
    installSourceMapSupport()
  }
  return code
}

export function register(client: IClient, opts: Options = {}) {
  if (piratesRevert) piratesRevert()

  piratesRevert = pirates.addHook(
    (process.env.BABEL_8_BREAKING ? compile : compileBabel7).bind(null, client),
    {
      exts: opts.extensions ?? client.getDefaultExtensions(),
      ignoreNodeModules: false,
    }
  )

  client.setOptions(opts)
}

export function revert() {
  if (piratesRevert) piratesRevert()
}
