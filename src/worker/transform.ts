// @ts-expect-error no types
import cloneDeep from 'clone-deep'
import path from 'node:path'
import fs from 'fs-extra'
// @ts-expect-error no type defs
import base32 from 'base32'

import * as babel from '@babel/core'
import { Options } from '../types'

import os from 'node:os'
import findCacheDir from 'find-cache-dir'

const nmRE = escapeRegExp(path.sep + 'node_modules' + path.sep)

function escapeRegExp(string: string) {
  return string.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
}

let cacheKey: string = process.env.NODE_ENV || 'development'
let cacheDir: string | undefined
let projectDir: string | undefined
let transformOpts: babel.TransformOptions

export function setOptions(opts: babel.TransformOptions & Options) {
  if (opts.cache !== false) {
    if (opts.cacheKey) {
      cacheKey = base32.encode(JSON.stringify(opts.cacheKey))
    }
    cacheDir = path.join(
      findCacheDir({ name: '@jcoreio/babel-register' }) ||
        os.homedir() ||
        os.tmpdir(),
      cacheKey
    )
    fs.mkdirsSync(cacheDir)
    projectDir = cacheDir
      .replace(/\/node_modules(\/.*|$)/, '')
      .replace(/\\node_modules(\\.*|$)/, '')
  }

  delete opts.cache
  delete opts.cacheKey
  delete opts.extensions

  transformOpts = {
    ...opts,
    caller: {
      name: '@babel/register',
      ...(opts.caller || {}),
    },
  }

  let cwd = transformOpts.cwd || '.'

  // Ensure that the working directory is resolved up front so that
  // things don't break if it changes later.
  cwd = transformOpts.cwd = path.resolve(cwd)

  if (transformOpts.ignore === undefined && transformOpts.only === undefined) {
    const cwdRE = escapeRegExp(cwd)

    // Only compile things inside the current working directory.
    transformOpts.only = [new RegExp('^' + cwdRE, 'i')]
    // Ignore any node_modules inside the current working directory.
    transformOpts.ignore = [
      new RegExp(`^${cwdRE}(?:${path.sep}.*)?${nmRE}`, 'i'),
    ]
  }
}

export async function transform(input: string, filename: string) {
  const { cached, store } = await cacheLookup(filename)
  if (cached) return cached

  // @ts-expect-error not in type defs
  const opts = await babel.loadOptionsAsync({
    // sourceRoot can be overwritten
    sourceRoot: path.dirname(filename) + path.sep,
    ...cloneDeep(transformOpts),
    filename,
  })

  // Bail out ASAP if the file has been ignored.
  if (opts === null) return null

  const transformed = await babel.transformAsync(input, {
    ...opts,
    sourceMaps: opts.sourceMaps === undefined ? 'both' : opts.sourceMaps,
    ast: false,
  })
  if (!transformed) throw new Error('transform result is not defined')

  const { code, map } = transformed
  if (!code) throw new Error('missing code from transformed')

  store({ code, map }).catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error(error)
  })
  return { code, map }
}

export function transformSync(input: string, filename: string) {
  const { cached, store } = cacheLookupSync(filename)
  if (cached) return cached

  // @ts-expect-error not in type defs
  const opts = new babel.OptionManager().init({
    // sourceRoot can be overwritten
    sourceRoot: path.dirname(filename) + path.sep,
    ...cloneDeep(transformOpts),
    filename,
  })

  // Bail out ASAP if the file has been ignored.
  if (opts === null) return null

  const transformed = babel.transformSync(input, {
    ...opts,
    sourceMaps: opts.sourceMaps === undefined ? 'both' : opts.sourceMaps,
    ast: false,
  })
  if (!transformed) throw new Error('transform result is not defined')

  const { code, map } = transformed
  if (!code) throw new Error('missing code from transformed')

  return store({ code, map })
}

const id = (value: unknown) => value

async function cacheLookup(filename: string) {
  const relPath = projectDir ? path.relative(projectDir, filename) : undefined
  if (!relPath || !cacheDir || relPath.startsWith('.'))
    return { cached: null, store: async (v: unknown) => v }

  const cachePath = path.join(cacheDir, relPath)

  const store = async (result: babel.BabelFileResult) => {
    const { code, map } = result
    if (code || map) {
      await fs.mkdirs(path.dirname(cachePath))
    }
    await Promise.all([
      code != null && fs.writeFile(cachePath, code, 'utf8'),
      map && fs.writeJson(`${cachePath}.map`, map),
    ])
  }

  try {
    const [{ mtime: cacheMtime }, { mtime: fileMtime }] = await Promise.all([
      fs.stat(cachePath),
      fs.stat(filename),
    ])

    if (cacheMtime >= fileMtime) {
      const [code, map] = await Promise.all([
        fs.readFile(cachePath, 'utf8'),
        fs.readJson(`${cachePath}.map`),
      ])
      return { cached: { code, map }, store }
    }
  } catch {
    // ignore
  }

  return { cached: null, store }
}

function cacheLookupSync(filename: string) {
  const relPath = projectDir ? path.relative(projectDir, filename) : undefined
  if (!relPath || !cacheDir || relPath.startsWith('.'))
    return { cached: null, store: id }

  const cachePath = path.join(cacheDir, relPath)

  const store = (result: babel.BabelFileResult) => {
    const { code, map } = result
    if (code || map) {
      fs.mkdirsSync(path.dirname(cachePath))
    }
    if (code) fs.writeFileSync(cachePath, code, 'utf8')
    if (map) fs.writeJsonSync(`${cachePath}.map`, map)
    return result
  }

  try {
    if (fs.statSync(cachePath).mtime >= fs.statSync(filename).mtime) {
      const code = fs.readFileSync(cachePath, 'utf8')
      const map = fs.readJsonSync(`${cachePath}.map`)
      return { cached: { code, map }, store }
    }
  } catch {
    // ignore
  }

  return { cached: null, store }
}
