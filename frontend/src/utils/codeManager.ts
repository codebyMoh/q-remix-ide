// codeManager.ts - Core code analysis functionality
import { ethers, JsonRpcProvider } from 'ethers';

// Types for our code manager
export interface SourceLocation {
  start: number;
  length: number;
  file: string;
  fileContent?: string;
}

export interface ContractSource {
  content: string;
  id: number;
}

export interface Contract {
  address: string;
  binary: string;
  sourceMap?: string;
  sources?: {
    [fileName: string]: ContractSource;
  };
  deployedBinary?: string;
  deployedSourceMap?: string;
  bytecode?: string;
  runtimeBytecode?: string;
  abi?: any[];
}

export interface CodeManagerInterface {
  getCode: (address: string) => Promise<string>;
  getInstructionIndex: (address: string, pc: number) => number;
  getSourceLocation: (stepIndex: number, address: string) => SourceLocation | null;
  getSourceCode: (sourceLocation: SourceLocation) => string | null;
  getDecoder: (address: string) => any;
}

export interface Instruction {
  pc: number;
  opcode: number;
  name: string;
  pushData?: string;
}

// Create the code manager factory
export const createCodeManager = (contracts: { [address: string]: Contract }, provider: JsonRpcProvider): CodeManagerInterface => {
  // Cache for bytecode to avoid redundant provider calls
  const codeCache: { [address: string]: string } = {};
  
  // Cache for parsed ASM instructions
  const asmInstructionsCache: { [address: string]: Instruction[] } = {};
  
  // Opcode lookup table - this would be more complete in a real implementation
  const opcodes: { [key: number]: string } = {
    0x00: 'STOP', 0x01: 'ADD', 0x02: 'MUL', 0x03: 'SUB', 0x04: 'DIV',
    0x05: 'SDIV', 0x06: 'MOD', 0x07: 'SMOD', 0x08: 'ADDMOD', 0x09: 'MULMOD',
    0x0a: 'EXP', 0x0b: 'SIGNEXTEND', 
    0x10: 'LT', 0x11: 'GT', 0x12: 'SLT', 0x13: 'SGT', 0x14: 'EQ',
    0x15: 'ISZERO', 0x16: 'AND', 0x17: 'OR', 0x18: 'XOR', 0x19: 'NOT',
    0x1a: 'BYTE', 0x1b: 'SHL', 0x1c: 'SHR', 0x1d: 'SAR',
    0x20: 'SHA3',
    0x30: 'ADDRESS', 0x31: 'BALANCE', 0x32: 'ORIGIN', 0x33: 'CALLER',
    0x34: 'CALLVALUE', 0x35: 'CALLDATALOAD', 0x36: 'CALLDATASIZE',
    0x37: 'CALLDATACOPY', 0x38: 'CODESIZE', 0x39: 'CODECOPY',
    0x3a: 'GASPRICE', 0x3b: 'EXTCODESIZE', 0x3c: 'EXTCODECOPY',
    0x3d: 'RETURNDATASIZE', 0x3e: 'RETURNDATACOPY', 0x3f: 'EXTCODEHASH',
    0x40: 'BLOCKHASH', 0x41: 'COINBASE', 0x42: 'TIMESTAMP', 0x43: 'NUMBER',
    0x44: 'DIFFICULTY', 0x45: 'GASLIMIT', 0x46: 'CHAINID', 0x47: 'SELFBALANCE',
    0x48: 'BASEFEE',
    0x50: 'POP', 0x51: 'MLOAD', 0x52: 'MSTORE', 0x53: 'MSTORE8',
    0x54: 'SLOAD', 0x55: 'SSTORE', 0x56: 'JUMP', 0x57: 'JUMPI',
    0x58: 'PC', 0x59: 'MSIZE', 0x5a: 'GAS', 0x5b: 'JUMPDEST',
    0x60: 'PUSH1', 0x61: 'PUSH2', 0x62: 'PUSH3', 0x63: 'PUSH4',
    0x64: 'PUSH5', 0x65: 'PUSH6', 0x66: 'PUSH7', 0x67: 'PUSH8',
    0x68: 'PUSH9', 0x69: 'PUSH10', 0x6a: 'PUSH11', 0x6b: 'PUSH12',
    0x6c: 'PUSH13', 0x6d: 'PUSH14', 0x6e: 'PUSH15', 0x6f: 'PUSH16',
    0x70: 'PUSH17', 0x71: 'PUSH18', 0x72: 'PUSH19', 0x73: 'PUSH20',
    0x74: 'PUSH21', 0x75: 'PUSH22', 0x76: 'PUSH23', 0x77: 'PUSH24',
    0x78: 'PUSH25', 0x79: 'PUSH26', 0x7a: 'PUSH27', 0x7b: 'PUSH28',
    0x7c: 'PUSH29', 0x7d: 'PUSH30', 0x7e: 'PUSH31', 0x7f: 'PUSH32',
    0x80: 'DUP1', 0x81: 'DUP2', 0x82: 'DUP3', 0x83: 'DUP4',
    0x84: 'DUP5', 0x85: 'DUP6', 0x86: 'DUP7', 0x87: 'DUP8',
    0x88: 'DUP9', 0x89: 'DUP10', 0x8a: 'DUP11', 0x8b: 'DUP12',
    0x8c: 'DUP13', 0x8d: 'DUP14', 0x8e: 'DUP15', 0x8f: 'DUP16',
    0x90: 'SWAP1', 0x91: 'SWAP2', 0x92: 'SWAP3', 0x93: 'SWAP4',
    0x94: 'SWAP5', 0x95: 'SWAP6', 0x96: 'SWAP7', 0x97: 'SWAP8',
    0x98: 'SWAP9', 0x99: 'SWAP10', 0x9a: 'SWAP11', 0x9b: 'SWAP12',
    0x9c: 'SWAP13', 0x9d: 'SWAP14', 0x9e: 'SWAP15', 0x9f: 'SWAP16',
    0xa0: 'LOG0', 0xa1: 'LOG1', 0xa2: 'LOG2', 0xa3: 'LOG3', 0xa4: 'LOG4',
    0xf0: 'CREATE', 0xf1: 'CALL', 0xf2: 'CALLCODE', 0xf3: 'RETURN',
    0xf4: 'DELEGATECALL', 0xf5: 'CREATE2', 0xfa: 'STATICCALL',
    0xfd: 'REVERT', 0xfe: 'INVALID', 0xff: 'SELFDESTRUCT'
  };
  
  // Parse bytecode into ASM instructions
  const parseCode = (bytecode: string): Instruction[] => {
    // Skip the 0x prefix
    if (bytecode.startsWith('0x')) {
      bytecode = bytecode.slice(2);
    }
    
    const instructions: Instruction[] = [];
    let i = 0;
    
    while (i < bytecode.length) {
      // Each opcode is 1 byte (2 hex chars)
      const opcode = parseInt(bytecode.slice(i, i + 2), 16);
      const pc = i / 2;
      
      let instruction: Instruction = { 
        pc, 
        opcode,
        name: opcodes[opcode] || `UNKNOWN (0x${opcode.toString(16)})` 
      };
      
      // Push operations (0x60 to 0x7f) have immediate data
      if (opcode >= 0x60 && opcode <= 0x7f) {
        const dataLength = opcode - 0x60 + 1; // Number of bytes to push
        const dataLengthHex = dataLength * 2; // Number of hex chars
        instruction.pushData = bytecode.slice(i + 2, i + 2 + dataLengthHex);
        i += 2 + dataLengthHex;
      } else {
        i += 2;
      }
      
      instructions.push(instruction);
    }
    
    return instructions;
  };
  
  // Parse source map string
  const parseSourceMap = (sourceMap: string) => {
    if (!sourceMap) return [];
    
    const entries = sourceMap.split(';');
    let lastEntry = { s: -1, l: -1, f: -1, j: -1 };
    
    return entries.map(entry => {
      const parts = entry.split(':');
      
      // Handle relative source maps (empty parts mean "same as before")
      if (parts[0] !== '') lastEntry.s = parseInt(parts[0]);
      if (parts.length > 1 && parts[1] !== '') lastEntry.l = parseInt(parts[1]);
      if (parts.length > 2 && parts[2] !== '') lastEntry.f = parseInt(parts[2]);
      if (parts.length > 3 && parts[3] !== '') lastEntry.j = parts[3] === '-' ? -1 : parseInt(parts[3]);
      
      return { ...lastEntry };
    });
  };
  
  return {
    getCode: async (address: string) => {
      // Return from cache if available
      if (codeCache[address]) {
        return codeCache[address];
      }
      
      // Check if we have the bytecode in our contracts object
      if (contracts[address]?.deployedBinary || contracts[address]?.runtimeBytecode) {
        const code = contracts[address].deployedBinary || contracts[address].runtimeBytecode || '';
        codeCache[address] = code.startsWith('0x') ? code : `0x${code}`;
        return codeCache[address];
      }
      
      // Otherwise fetch from the network
      try {
        const code = await provider.getCode(address);
        codeCache[address] = code;
        return code;
      } catch (error) {
        console.warn("Failed to get code:", error);
        return "0x";
      }
    },
    
    getInstructionIndex: (address: string, pc: number) => {
      // Return the index of instruction that corresponds to this program counter
      if (!asmInstructionsCache[address]) {
        // Try to get code from cache first
        const code = codeCache[address];
        if (code && code !== '0x') {
          asmInstructionsCache[address] = parseCode(code);
        } else {
          // If we don't have it yet, return the PC directly
          return pc;
        }
      }
      
      // Find the instruction with matching PC
      const instructions = asmInstructionsCache[address];
      const idx = instructions.findIndex(inst => inst.pc === pc);
      return idx >= 0 ? idx : pc;
    },
    
    getSourceLocation: (stepIndex: number, address: string) => {
      // If we don't have contract metadata, we can't map to source
      if (!contracts[address] || !contracts[address].sources || !contracts[address].deployedSourceMap) {
        return null;
      }
      
      try {
        // Get source map entry for this step
        const sourceMap = parseSourceMap(contracts[address].deployedSourceMap || '');
        if (!sourceMap[stepIndex]) {
          return null;
        }
        
        const { s: start, l: length, f: fileIndex } = sourceMap[stepIndex];
        if (fileIndex === -1 || start === -1) {
          return null;
        }
        
        // Find the file by index
        const fileEntry = Object.entries(contracts[address].sources || {}).find(
          ([_, source]) => source.id === fileIndex
        );
        
        if (!fileEntry) {
          return null;
        }
        
        return {
          start,
          length,
          file: fileEntry[0],
          fileContent: fileEntry[1].content
        };
      } catch (error) {
        console.error("Error mapping source location:", error);
        return null;
      }
    },
    
    getSourceCode: (sourceLocation: SourceLocation) => {
      if (!sourceLocation || !sourceLocation.fileContent) {
        return null;
      }
      
      try {
        return sourceLocation.fileContent.slice(
          sourceLocation.start,
          sourceLocation.start + sourceLocation.length
        );
      } catch (error) {
        console.error("Error getting source code:", error);
        return null;
      }
    },
    
    getDecoder: (address: string) => {
      // In a full implementation, this would use the ABI and ethers utils
      // to decode function calls, return values, and variables
      const contract = contracts[address];
      const abi = contract?.abi || [];
      
      return {
        decodeLocalVariables: (data: string, pc: number) => {
          // This would require debug info not typically available
          return {};
        },
        
        decodeStateVariables: async () => {
          // This would require calling storage slots and decoding based on contract layout
          return {};
        },
        
        decodeParams: (types: string[], data: string) => {
          try {
            // Using ethers AbiCoder to decode parameters
            const abiCoder = ethers.AbiCoder.defaultAbiCoder();
            return abiCoder.decode(types, data);
          } catch (error) {
            console.error("Error decoding parameters:", error);
            return [];
          }
        }
      };
    }
  };
};

// Example contract ABI - you'll get this from your compilation output
const sampleABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "newValue",
        "type": "uint256"
      }
    ],
    "name": "updateValue",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "value",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

// Example deployed bytecode (simplified)
const sampleBytecode = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b50600436106100365760003560e01c80633fa4f2451461003b5780635bff0b1114610059575b600080fd5b610043610075565b60405161005091906100a1565b60405180910390f35b61007360048036038101906100649190610108565b61007b565b005b60005481565b8060008190555050565b6000819050919050565b61009b81610088565b82525050565b60006020820190506100b66000830184610092565b92915050565b600080fd5b6100ca81610088565b81146100d557600080fd5b50565b6000813590506100e7816100c1565b92915050565b60006020828403121561010357610102610114565b5b6000610111848285016100d8565b91505092915050565b61011f816100c1565b811461012a57600080fd5b5056fea2646970667358221220f77a9f3cf2b6a620f7fa71b26d2f17b5a16220548298a1852cb19c3c5456260064736f6c63430008090033";

// Example source map (simplified)
const sampleSourceMap = "0:75:0;76:9:1;85:12:0;97:9:1;106:17:0;123:9:1;132:34:0;166:10:1;176:93:0";

// Example source code
const sampleSource = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract SimpleStorage {
    uint256 public value;
    
    constructor() {
        value = 0;
    }
    
    function updateValue(uint256 newValue) public {
        value = newValue;
    }
}
`;