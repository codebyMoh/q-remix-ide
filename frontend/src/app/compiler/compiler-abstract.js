// src/app/compiler/compiler-abstract.js
export default class CompilerAbstract {
    constructor(version, data, source) {
      this.version = version
      this.data = data
      this.source = source
    }
  
    getContracts() {
      return Object.keys(this.data.contracts).map(contractName => ({
        name: contractName,
        object: this.data.contracts[contractName]
      }))
    }
  
    getVersion() {
      return this.version
    }
  
    getSource() {
      return this.source
    }
  }