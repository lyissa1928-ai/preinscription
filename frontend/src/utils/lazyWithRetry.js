import { lazy } from 'react'
import { isChunkLoadError, tryReloadOnceForStaleChunk } from './chunkLoadRecovery'

/**
 * lazy() avec récupération auto si le fichier JS a disparu après un déploiement.
 */
export function lazyWithRetry(factory) {
  return lazy(async () => {
    try {
      return await factory()
    } catch (err) {
      if (isChunkLoadError(err) && tryReloadOnceForStaleChunk()) {
        return new Promise(() => {})
      }
      throw err
    }
  })
}
