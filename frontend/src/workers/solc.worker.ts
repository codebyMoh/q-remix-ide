import wrapper from 'solc/wrapper';

// Load compiler ONCE when worker initializes.
// Rn the compiler version is loading statically, we can make it dynamic by just making the "importScripts" dynamic.
importScripts('https://binaries.soliditylang.org/bin/soljson-v0.8.19+commit.7dd6d404.js');
const compiler = wrapper((self as any).Module);

self.onmessage = (event) => {
  try {
    const sourceCode = {
      language: 'Solidity',
      sources: {
        // Use dynamic source name from filename
        [event.data.filename]: { 
          content: event.data.contractCode 
        }
      },
      settings: {
        outputSelection: { 
          '*': { 
            '*': ['*'] 
          } 
        }
      }
    };

    const output = JSON.parse(compiler.compile(JSON.stringify(sourceCode)));
    self.postMessage({ output, filename: event.data.filename });
    
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};