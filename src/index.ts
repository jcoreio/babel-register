'use strict'

/**
 * This file wraps the compiled ES6 module implementation of register so
 * that it can be used both from a standard CommonJS environment, and also
 * from a compiled Babel import.
 */

import _register from './nodeWrapper'

export default function register(
  this: any,
  ...args: Parameters<typeof _register>
) {
  return _register.apply(this, args)
}
register.revert = _register.revert
