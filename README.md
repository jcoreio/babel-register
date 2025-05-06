# @jcoreio/babel-register

babel-register fork that caches transformed files separately on disk instead of using a monolithic json file

[![CircleCI](https://circleci.com/gh/jcoreio/babel-register-files-cache.svg?style=svg)](https://circleci.com/gh/jcoreio/babel-register-files-cache)
[![Coverage Status](https://codecov.io/gh/jcoreio/babel-register-files-cache/branch/master/graph/badge.svg)](https://codecov.io/gh/jcoreio/babel-register-files-cache)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![npm version](https://badge.fury.io/js/babel-register-files-cache.svg)](https://badge.fury.io/js/babel-register-files-cache)

## Usage Example

Usage is similar to `@babel/register`, but it's recommended to pass a `cacheKey` that includes any
information that affects your babel configuration:

```js
const { COVERAGE, NODE_ENV, TEST, TARGET } = process.env

require('@jcoreio/babel-register')({
  cacheKey: { COVERAGE, NODE_ENV, TEST, TARGET },
  extensions: ['.tsx', '.ts', '.js'],
})
require('./index.ts')
```

`@jcoreio/babel-register` will use `` `node_modules/.cache/@jcoreio/babel-register/${base32(JSON.stringify(cacheKey))}` `` as the
cache directory, and cache files relative to your project root directory in it.
