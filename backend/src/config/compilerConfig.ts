
const solc = require('solc');

export const compileSolidity = (sourceCode: string) => {
    const input = {
        language: 'Solidity',
        sources: {
            'contract.sol': {
                content: sourceCode,
            },
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': ['abi','evm.bytecode'],
                },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    return output;
};