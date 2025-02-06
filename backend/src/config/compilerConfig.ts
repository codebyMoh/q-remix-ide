import solc from 'solc';

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
                    '*': ['*'],
                },
            },
        },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));
    return output;
};