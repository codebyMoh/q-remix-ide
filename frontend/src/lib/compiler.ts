export interface ContractData {
  contractName: string;
  byteCode: string;
  abi: any[];
}

export interface Warning {
  severity: string;
  message: string;
  sourceLocation?: { file: string; start: number; end: number };
  formattedMessage: string;
}

export const compile = (
  contractCode: string,
  compilerVersion: string = "0.8.19+commit.7dd6d404",
  onWarnings?: (warnings: Warning[]) => void
): Promise<ContractData[]> => {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("../workers/solc.worker.ts", import.meta.url), { 
      type: "module" 
    });
    
    const filename = `contract_${Date.now()}.sol`;

    worker.onmessage = (e) => {
      try {
        if (e.data.error) {
          reject(new Error(e.data.error));
          return;
        }

        const output = e.data.output;

        if (output.errors) {
          const errors = output.errors
            .filter((e: any) => e.severity === "error")
            .map((e: any) => e.formattedMessage);
          const warnings = output.errors.filter((e: any) => e.severity === "warning");
          
          if (errors.length > 0) {
            const message = errors.join('\n');
            reject(new Error(message));
            return;
          }
          if (warnings.length > 0) {
            console.warn("Compilation warnings:\n", warnings.map(w => w.formattedMessage).join('\n'));
            if (onWarnings) onWarnings(warnings);
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
              abi: contract.abi,
            });
          }
        }

        if (result.length === 0) {
          reject(new Error("No contracts found in the source code"));
          return;
        }
        resolve(result);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      } finally {
        worker.terminate();
      }
    };

    worker.postMessage({ 
      contractCode,
      filename,
      compilerVersion,
    });
  });
};