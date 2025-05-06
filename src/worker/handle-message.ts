 
import type { ACTIONS } from '../types'

import * as babel from '@babel/core'
import { transform, transformSync, setOptions } from './transform'

export function handleMessage(action: ACTIONS, payload: any) {
  switch (action) {
    case 'GET_DEFAULT_EXTENSIONS':
      return babel.DEFAULT_EXTENSIONS
    case 'SET_OPTIONS':
      setOptions(payload)
      return
    case 'TRANSFORM':
      return transform(payload.code, payload.filename)
    case 'TRANSFORM_SYNC':
      return transformSync(payload.code, payload.filename)
  }

  throw new Error(`Unknown internal parser worker action: ${action}`)
}
