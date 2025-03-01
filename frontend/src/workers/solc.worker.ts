import wrapper from 'solc/wrapper';

self.onmessage = async (event) => {
  try {
    const { contractCode, filename, compilerVersion, timestamp } = event.data;
    
    console.log(`Loading compiler version: ${compilerVersion} (timestamp: ${timestamp})`);
    
    // Use the timestamp to avoid cached compiler version
    const compilerURL = `https://binaries.soliditylang.org/bin/soljson-v${compilerVersion}.js?t=${timestamp}`;
    
    // Load the compiler fresh each time
    self.importScripts(compilerURL);
    const compiler = wrapper(self.Module);
    
    console.log(`Compiling contract: ${filename}`);
    
    const sourceCode = {
      language: 'Solidity',
      sources: {
        [filename]: {
          content: contractCode
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
    
    // Parse the output from the compiler
    const output = JSON.parse(compiler.compile(JSON.stringify(sourceCode)));
    
    // Extract warnings and errors separately
    const warnings = [];
    const errors = [];
    
    if (output.errors) {
      for (const error of output.errors) {
        if (error.severity === 'error') {
          errors.push(error.formattedMessage);
        } else if (error.severity === 'warning') {
          warnings.push(error.formattedMessage);
        }
      }
    }
    
    // If there are errors, return them
    if (errors.length > 0) {
      self.postMessage({
        error: errors.join('\n'),
        warnings: warnings,
        timestamp // Return the timestamp for verification
      });
      return;
    }
    
    // Critical check: Make sure output.contracts exists and has content for the filename
    if (!output.contracts || !output.contracts[filename] || Object.keys(output.contracts[filename]).length === 0) {
      self.postMessage({
        error: "Compilation failed: No contract objects were generated. This likely indicates a syntax error or other critical issue.",
        warnings: warnings,
        timestamp
      });
      return;
    }
    
    // Process the output into a simpler format
    const contracts = [];
    
    for (const [contractName, contractData] of Object.entries(output.contracts[filename])) {
      contracts.push({
        contractName,
        abi: contractData.abi,
        byteCode: contractData.evm.bytecode.object
      });
    }
    
    console.log(`Compilation successful. Found ${contracts.length} contracts.`);
    
    self.postMessage({
      contracts,
      warnings,
      timestamp
    });
  } catch (error) {
    console.error('Compilation error:', error);
    self.postMessage({
      error: error.message || "Unknown compilation error"
    });
  }
};