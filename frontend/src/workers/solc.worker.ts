import wrapper from "solc/wrapper";

self.onmessage = (event) => {
  const { contractCode, filename, compilerVersion } = event.data;
  
  try {
    const url = `https://binaries.soliditylang.org/bin/soljson-v${compilerVersion}.js?t=${Date.now()}`;
    console.log("Loading compiler from:", url);
    importScripts(url);
    
    if (!self.Module) {
      throw new Error(`Failed to initialize compiler for version ${compilerVersion}`);
    }
    
    const compiler = wrapper(self.Module);
    console.log("Compiler loaded for version:", compilerVersion);

    const sourceCode = {
      language: "Solidity",
      sources: {
        [filename]: { content: contractCode },
      },
      settings: {
        outputSelection: {
          "*": { "*": ["*"] },
        },
      },
    };

    const output = JSON.parse(compiler.compile(JSON.stringify(sourceCode)));
    self.postMessage({ output, filename });
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({ error: `Failed to load or run compiler version ${compilerVersion}: ${error.message}` });
  }
};