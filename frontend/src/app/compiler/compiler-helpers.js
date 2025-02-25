import { WorkerWrapper } from '../../utils/worker'
import CompilerAbstract from './compiler-abstract'

let worker = null

export const compile = async (sources, settings) => {
  if (!worker) {
    worker = new WorkerWrapper(new URL('../../workers/compiler.worker.js', import.meta.url))
  }

  const input = {
    language: settings.language,
    sources: Object.keys(sources).reduce((acc, key) => {
      acc[key] = { content: sources[key].content }
      return acc
    }, {}),
    settings: {
      outputSelection: {
        '*': {
          '*': ['*']
        }
      },
      evmVersion: settings.evmVersion,
      optimizer: {
        enabled: settings.optimize,
        runs: settings.runs
      }
    }
  }

  try {
    const output = await worker.compile(JSON.stringify(input))
    
    if (output.errors) {
      const errors = output.errors.filter(e => e.severity === 'error')
      if (errors.length > 0) {
        throw new Error(errors.map(e => e.formattedMessage).join('\n'))
      }
    }

    return new CompilerAbstract(settings.version, output, sources)
  } catch (error) {
    throw error
  }
}

export const canUseWorker = (version) => {
  return true
}

export const urlFromVersion = (version) => {
  return `https://binaries.soliditylang.org/bin/soljson-${version}.js`
}