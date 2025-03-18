import wrapper from "solc/wrapper";

self.onmessage = async (event) => {
  try {
    const { contractCode, filename, compilerVersion, timestamp } = event.data;

    
    // Append timestamp to avoid caching
    const compilerURL = `https://binaries.soliditylang.org/bin/soljson-v${compilerVersion}.js?t=${timestamp}`;
    importScripts(compilerURL);

    if (!self.Module) {
      throw new Error(`Failed to initialize compiler for version ${compilerVersion}`);
    }

    const compiler = wrapper(self.Module);

    
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
;
    
    const warnings: string[] = [];
    const errors: string[] = [];
    
    if (output.errors) {
      for (const error of output.errors) {
        if (error.severity === "error") {
          errors.push(error.formattedMessage);
        } else if (error.severity === "warning") {
          warnings.push(error.formattedMessage);
        }
      }
    }
    
    if (errors.length > 0) {
      self.postMessage({ error: errors.join("\n"), warnings, timestamp });
      return;
    }
    
    if (!output.contracts || !output.contracts[filename] || Object.keys(output.contracts[filename]).length === 0) {
      self.postMessage({ error: "Compilation failed: No contract objects were generated.", warnings, timestamp });
      return;
    }
    
    const contracts = [];
    for (const [contractName, contractData] of Object.entries(output.contracts[filename])) {
      contracts.push({
        contractName,
        abi: contractData.abi,
        byteCode: contractData.evm?.bytecode?.object || "0x",
      });
    }
    self.postMessage({ contracts, warnings, timestamp });
  } catch (error) {
    console.error("Worker error:", error);
    self.postMessage({ error: error.message || "Unknown compilation error" });
  }
};
