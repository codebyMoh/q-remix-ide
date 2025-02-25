export const compile = (contractCode: string): Promise<ContractData[]> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/solc.worker.ts", import.meta.url), { 
      type: "module" 
    });
    
    const filename = `contract_${Date.now()}.sol`;

    worker.onmessage = (e) => {
      try {
        if (e.data.error) {
          reject(e.data.error);
          return;
        }

        const output = e.data.output;
        
        // Handle compiler errors
        if (output.errors) {
          const errors = output.errors
            .filter((e: any) => e.severity === 'error')
            .map((e: any) => e.formattedMessage);
          
          if (errors.length > 0) {
            reject(new Error(errors.join('\n')));
            return;
          }
        }

        const result: ContractData[] = [];

        for (const sourceName in output.contracts) {
          const contracts = output.contracts[sourceName];
          for (const contractName in contracts) {
            const contract = contracts[contractName];
            result.push({
              contractName,
              byteCode: contract.evm.bytecode.object,
              abi: contract.abi
            });
          }
        }

        if (result.length === 0) {
          reject(new Error('No contracts found in the source code'));
          return;
        }

        resolve(result);
        
      } catch (error) {
        reject(error);
      } finally {
        worker.terminate();
      }
    };

    worker.postMessage({ 
      contractCode,
      filename
    });
  });
};