import solc from 'solc'

let compilerInstance = null

export const loadCompiler = async () => {
  if (!compilerInstance) {
    // Load the default compiler version
    compilerInstance = solc
  }
  return compilerInstance
}