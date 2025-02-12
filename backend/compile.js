const fs = require('fs-extra');
const path = require('path');
const solc = require('solc');
const crypto = require('crypto');

// Ensure the artifacts directory exists
const artifactsDir = path.join(__dirname, 'artifacts');
if (!fs.existsSync(artifactsDir)) {
  fs.mkdirSync(artifactsDir);
}

// Ensure the build-info directory exists
const buildInfoDir = path.join(artifactsDir, 'build-info');
if (!fs.existsSync(buildInfoDir)) {
  fs.mkdirSync(buildInfoDir);
}

// Read all Solidity files in the contracts directory
const contractsDir = path.join(__dirname, 'contracts');
const contractFiles = fs.readdirSync(contractsDir).filter((file) => file.endsWith('.sol'));

// Prepare the Solidity compiler input
const input = {
  language: 'Solidity',
  sources: {},
  settings: {
    outputSelection: {
      '*': {
        '*': ['*'],
      },
    },
  },
};

// Add each Solidity file to the compiler input
contractFiles.forEach((file) => {
  const filePath = path.join(contractsDir, file);
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  input.sources[file] = { content: sourceCode };
});

// Compile all contracts
const output = JSON.parse(solc.compile(JSON.stringify(input)));

// Check for errors
if (output.errors) {
  const errors = output.errors.filter((error) => error.severity === 'error');
  if (errors.length > 0) {
    console.error('Compilation errors:', errors);
    process.exit(1);
  }
}

// Process each compiled contract
Object.entries(output.contracts).forEach(([file, contracts]) => {
  Object.entries(contracts).forEach(([contractName, contract]) => {
    // Generate a unique hash for build-info
    const sourceCode = input.sources[file].content;
    const hash = crypto.createHash('sha256').update(sourceCode).digest('hex');

    // Save the main artifact (<contractName>.json)
    const artifact = {
      contractName,
      abi: contract.abi,
      bytecode: contract.evm.bytecode.object,
      deployedBytecode: contract.evm.deployedBytecode.object,
      gasEstimates: contract.evm.gasEstimates,
      methodIdentifiers: contract.evm.methodIdentifiers,
    };

    fs.writeFileSync(
      path.join(artifactsDir, `${contractName}.json`),
      JSON.stringify(artifact, null, 2)
    );

    // Save the metadata artifact (<contractName>_metadata.json)
    const metadata = contract.metadata;
    fs.writeFileSync(
      path.join(artifactsDir, `${contractName}_metadata.json`),
      JSON.stringify(metadata, null, 2)
    );

    // Save the build-info artifact (build-info/<dynamic_hash>.json)
    const buildInfo = {
      solcVersion: output.version,
      input: {
        [file]: input.sources[file],
      },
      output: {
        [file]: {
          [contractName]: contract,
        },
      },
    };

    fs.writeFileSync(
      path.join(buildInfoDir, `${hash}.json`),
      JSON.stringify(buildInfo, null, 2)
    );
  });
});

console.log(`Compilation successful! Artifacts saved to ${artifactsDir}`);