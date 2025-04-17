export const solidityKeywords = [
  'abstract', 'after', 'alias', 'apply', 'auto', 'calldata', 'catch', 'constant',
  'constructor', 'contract', 'debug', 'default', 'delete', 'do', 'else', 'emit',
  'enum', 'error', 'event', 'external', 'fallback', 'false', 'final', 'for',
  'function', 'hex', 'if', 'immutable', 'import', 'in', 'indexed', 'interface',
  'internal', 'is', 'library', 'mapping', 'memory', 'modifier', 'new', 'null',
  'override', 'payable', 'pragma', 'private', 'public', 'pure', 'return',
  'returns', 'revert', 'selfdestruct', 'solidity', 'storage', 'string', 'struct',
  'super', 'supportsInterface', 'this', 'throw', 'true', 'try', 'type', 'unchecked',
  'using', 'virtual', 'while', 'with'
];

export const solidityTypes = [
  'address', 'bool', 'byte', 'bytes', 'bytes1', 'bytes2', 'bytes3', 'bytes4',
  'bytes5', 'bytes6', 'bytes7', 'bytes8', 'bytes9', 'bytes10', 'bytes11',
  'bytes12', 'bytes13', 'bytes14', 'bytes15', 'bytes16', 'bytes17', 'bytes18',
  'bytes19', 'bytes20', 'bytes21', 'bytes22', 'bytes23', 'bytes24', 'bytes25',
  'bytes26', 'bytes27', 'bytes28', 'bytes29', 'bytes30', 'bytes31', 'bytes32',
  'int', 'int8', 'int16', 'int24', 'int32', 'int40', 'int48', 'int56', 'int64',
  'int72', 'int80', 'int88', 'int96', 'int104', 'int112', 'int120', 'int128',
  'int136', 'int144', 'int152', 'int160', 'int168', 'int176', 'int184', 'int192',
  'int200', 'int208', 'int216', 'int224', 'int232', 'int240', 'int248', 'int256',
  'uint', 'uint8', 'uint16', 'uint24', 'uint32', 'uint40', 'uint48', 'uint56',
  'uint64', 'uint72', 'uint80', 'uint88', 'uint96', 'uint104', 'uint112',
  'uint120', 'uint128', 'uint136', 'uint144', 'uint152', 'uint160', 'uint168',
  'uint176', 'uint184', 'uint192', 'uint200', 'uint208', 'uint216', 'uint224',
  'uint232', 'uint240', 'uint248', 'uint256'
];

export const soliditySnippets = [
  {
    label: 'contract',
    insertText: [
      'contract ${1:Name} {',
      '\t$0',
      '}'
    ].join('\n'),
    documentation: 'Create a new contract'
  },
  {
    label: 'function',
    insertText: [
      'function ${1:name}(${2:params}) ${3:public} ${4:returns} (${5:returnType}) {',
      '\t$0',
      '}'
    ].join('\n'),
    documentation: 'Create a new function'
  },
  {
    label: 'modifier',
    insertText: [
      'modifier ${1:name}() {',
      '\t_;',
      '}'
    ].join('\n'),
    documentation: 'Create a new modifier'
  },
  {
    label: 'event',
    insertText: [
      'event ${1:Name}(${2:params});'
    ].join('\n'),
    documentation: 'Create a new event'
  },
  {
    label: 'error',
    insertText: [
      'error ${1:Name}(${2:params});'
    ].join('\n'),
    documentation: 'Create a new error'
  },
  {
    label: 'struct',
    insertText: [
      'struct ${1:Name} {',
      '\t${2:type} ${3:name};',
      '\t$0',
      '}'
    ].join('\n'),
    documentation: 'Create a new struct'
  },
  {
    label: 'mapping',
    insertText: [
      'mapping(${1:keyType} => ${2:valueType}) ${3:name};'
    ].join('\n'),
    documentation: 'Create a new mapping'
  },
  {
    label: 'require',
    insertText: [
      'require(${1:condition}, "${2:error message}");'
    ].join('\n'),
    documentation: 'Add a require statement'
  },
  {
    label: 'if',
    insertText: [
      'if (${1:condition}) {',
      '\t$0',
      '}'
    ].join('\n'),
    documentation: 'Add an if statement'
  },
  {
    label: 'for',
    insertText: [
      'for (${1:uint i = 0}; ${2:i < length}; ${3:i++}) {',
      '\t$0',
      '}'
    ].join('\n'),
    documentation: 'Add a for loop'
  }
]; 