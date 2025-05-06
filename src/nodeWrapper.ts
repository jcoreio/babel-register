'use strict'

/**
 * This file wraps the implementation of register so all modules `require()`-ed
 * internally within register are stored in a separate module cache.
 * This prevents un-transformed modules being stored in global module cache,
 * and allows register to transform these modules if they are loaded externally.
 */

// TODO: Remove this file in Babel 8

import Module from 'node:module'

// @ts-expect-error no type defs
const globalModuleCache = Module._cache
const internalModuleCache = Object.create(null)

// @ts-expect-error no type defs
Module._cache = internalModuleCache
import register from './node'

// NOTE: This Module._cache set is intercepted by the beforeEach hook in
// packages/babel-register/test/index.js to install dependencies mocks.
// @ts-expect-error no type defs
Module._cache = globalModuleCache

// Add source-map-support to global cache as it's stateful
const smsPath = require.resolve('source-map-support')
globalModuleCache[smsPath] = internalModuleCache[smsPath]

register()
export default register
