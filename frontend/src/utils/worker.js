export class WorkerWrapper {
    constructor(worker) {
      this.worker = new Worker(worker)
      this.promises = new Map()
      this.id = 0
  
      this.worker.onmessage = (event) => {
        const { id, output, error } = event.data
        const promise = this.promises.get(id)
        
        if (promise) {
          if (error) {
            promise.reject(error)
          } else {
            promise.resolve(output)
          }
          this.promises.delete(id)
        }
      }
    }
  
    compile(input) {
      return new Promise((resolve, reject) => {
        const id = this.id++
        this.promises.set(id, { resolve, reject })
        this.worker.postMessage({ id, input })
      })
    }
  
    terminate() {
      this.worker.terminate()
    }
  }