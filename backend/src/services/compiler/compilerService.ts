import { compileSolidity } from '../../config/compilerConfig';

export const compileContract = (sourceCode: string) => {
    const output = compileSolidity(sourceCode);

    
    if (output.errors) {
        const errors = output.errors
            .filter((error: any) => error.severity === 'error')
            .map((error: any) => error.formattedMessage);

        if (errors.length > 0) {
            throw new Error(errors.join('\n'));
        }
    }

    return output.contracts['contract.sol'];
};