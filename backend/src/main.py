from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional, Dict, Any, List
import logging
import time
from functools import lru_cache
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Common Solidity patterns and snippets
SOLIDITY_PATTERNS = {
    'contract': {
        'pattern': r'contract\s+\w+\s*{',
        'suggestion': '''contract MyToken is ERC20, Ownable, Pausable {
    using SafeMath for uint256;
    
    uint256 private constant TOTAL_SUPPLY = 1000000 * 10**18;  // 1 million tokens
    uint256 public constant MAX_BUY_AMOUNT = 10000 * 10**18;   // 10k tokens
    
    mapping(address => bool) public isExcluded;
    mapping(address => uint256) public lastTransactionTime;
    
    event ExclusionSet(address indexed account, bool excluded);
    event MaxBuyExceeded(address indexed buyer, uint256 amount);
    
    constructor() ERC20("MyToken", "MTK") {
        _mint(msg.sender, TOTAL_SUPPLY);
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
}'''
    },
    'function': {
        'pattern': r'function\s+\w+\s*\(',
        'suggestion': '''function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
    require(recipient != address(0), "Transfer to zero address");
    require(amount > 0, "Amount must be positive");
    require(amount <= balanceOf(msg.sender), "Insufficient balance");
    
    if (!isExcluded[msg.sender] && !isExcluded[recipient]) {
        require(amount <= MAX_BUY_AMOUNT, "Amount exceeds max buy");
        require(block.timestamp >= lastTransactionTime[recipient] + 1 hours, "Too frequent");
    }
    
    _transfer(msg.sender, recipient, amount);
    lastTransactionTime[recipient] = block.timestamp;
    
    emit Transfer(msg.sender, recipient, amount);
    return true;
}'''
    },
    'event': {
        'pattern': r'event\s+\w+\s*\(',
        'suggestion': '''event TokensBought(
    address indexed buyer,
    uint256 amount,
    uint256 cost,
    uint256 timestamp
);

event TokensSold(
    address indexed seller,
    uint256 amount,
    uint256 earnings,
    uint256 timestamp
);'''
    },
    'mapping': {
        'pattern': r'mapping\s*\(',
        'suggestion': '''mapping(address => uint256) private _balances;
mapping(address => mapping(address => uint256)) private _allowances;
mapping(address => bool) public isWhitelisted;
mapping(address => uint256) public lastTradeTimestamp;'''
    },
    'require': {
        'pattern': r'require\s*\(',
        'suggestion': '''require(!paused(), "Contract is paused");
require(msg.sender == owner(), "Caller is not owner");
require(amount <= maxTransactionAmount, "Exceeds max transaction");
require(block.timestamp >= cooldownTime[msg.sender], "Cooldown active");'''
    },
    'import': {
        'pattern': r'import\s+',
        'suggestion': '''// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";'''
    },
    'struct': {
        'pattern': r'struct\s+\w+\s*{',
        'suggestion': '''struct TradeInfo {
    address trader;
    uint256 amount;
    uint256 price;
    uint256 timestamp;
    TradeType tradeType;
    bool isProcessed;
}

struct UserInfo {
    uint256 totalTrades;
    uint256 totalVolume;
    uint256 lastTradeTime;
    bool isWhitelisted;
    TradeInfo[] trades;
}'''
    },
    'modifier': {
        'pattern': r'modifier\s+\w+\s*\(',
        'suggestion': '''modifier onlyAdmin() {
    require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Caller is not admin");
    _;
}

modifier whenNotLocked() {
    require(!tradingLocked, "Trading is locked");
    _;
}

modifier validAmount(uint256 amount) {
    require(amount > 0, "Amount must be positive");
    require(amount <= maxTransactionAmount, "Exceeds max amount");
    _;
}'''
    }
}

# Add more Solidity-specific completions
SOLIDITY_KEYWORDS = {
    'view': 'view returns ',
    'pure': 'pure returns ',
    'payable': 'payable ',
    'memory': 'memory ',
    'storage': 'storage ',
    'calldata': 'calldata ',
    'public': 'public ',
    'private': 'private ',
    'internal': 'internal ',
    'external': 'external ',
    'returns': 'returns ',
    'virtual': 'virtual ',
    'override': 'override ',
    'constant': 'constant ',
    'immutable': 'immutable '
}

SOLIDITY_TYPES = {
    'uint': 'uint256 ',
    'uint256': 'uint256 ',
    'address': 'address ',
    'bool': 'bool ',
    'string': 'string ',
    'bytes': 'bytes ',
    'bytes32': 'bytes32 ',
    'mapping': 'mapping(address => uint256) ',
    'array': 'uint256[] '
}

SOLIDITY_FUNCTIONS = {
    'constructor': '''constructor(string memory name_, string memory symbol_) ERC20(name_, symbol_) {
    _mint(msg.sender, TOTAL_SUPPLY);
}''',
    'transfer': '''function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
    require(recipient != address(0), "Transfer to zero address");
    require(amount <= balanceOf(msg.sender), "Insufficient balance");
    _transfer(msg.sender, recipient, amount);
    return true;
}''',
    'approve': '''function approve(address spender, uint256 amount) public virtual override returns (bool) {
    require(spender != address(0), "Approve to zero address");
    _approve(msg.sender, spender, amount);
    return true;
}''',
    'mint': '''function mint(address to, uint256 amount) public onlyOwner {
    require(to != address(0), "Mint to zero address");
    _mint(to, amount);
}''',
    'burn': '''function burn(uint256 amount) public virtual {
    require(amount <= balanceOf(msg.sender), "Burn amount exceeds balance");
    _burn(msg.sender, amount);
}'''
}

# Precompile regex patterns for better performance
COMPILED_PATTERNS = {key: re.compile(pattern_data['pattern'], re.IGNORECASE) 
                    for key, pattern_data in SOLIDITY_PATTERNS.items()}

# Cache for storing recent completions with a larger size
@lru_cache(maxsize=500)
def get_cached_completion(prompt: str, context: str) -> Optional[str]:
    return None

class CompletionRequest(BaseModel):
    prompt: str
    promptData: Dict[str, Any]

@app.post("/generate")
async def generate_completion(request: CompletionRequest):
    start_time = time.time()
    logger.info(f"Received completion request with prompt length: {len(request.prompt)}")
    
    try:
        # Extract context from promptData
        context = {
            'currentLine': request.promptData.get('currentLine', ''),
            'cursorPosition': request.promptData.get('cursorPosition', 0),
            'currentWord': request.promptData.get('currentWord', ''),
            'wordBeforeCursor': request.promptData.get('wordBeforeCursor', ''),
            'isBeginningOfLine': request.promptData.get('isBeginningOfLine', False),
            'isImporting': request.promptData.get('isImporting', False),
            'isPragma': request.promptData.get('isPragma', False),
            'isContract': request.promptData.get('isContract', False),
            'isFunction': request.promptData.get('isFunction', False),
            'isEvent': request.promptData.get('isEvent', False),
            'isModifier': request.promptData.get('isModifier', False),
            'isMapping': request.promptData.get('isMapping', False),
            'isRequire': request.promptData.get('isRequire', False),
            'isOpenZeppelin': request.promptData.get('isOpenZeppelin', False),
            'previousLines': request.promptData.get('previousLines', ''),
            'nextLines': request.promptData.get('nextLines', '')
        }
        
        logger.info(f"Context for completion: {context}")
        
        # Check cache first
        cache_key = f"{request.prompt}:{str(context)}"
        cached_result = get_cached_completion(request.prompt, str(context))
        if cached_result:
            logger.info("Returning cached completion")
            return {"suggestion": cached_result}
        
        # Generate suggestion based on context
        suggestion = generate_solidity_suggestion(context)
        
        # Cache the result
        get_cached_completion.cache_clear()  # Clear old cache entries
        get_cached_completion(request.prompt, str(context))
        
        end_time = time.time()
        logger.info(f"Generated completion in {end_time - start_time:.2f} seconds")
        
        return {"suggestion": suggestion}
        
    except Exception as e:
        logger.error(f"Error generating completion: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

def generate_solidity_suggestion(context: Dict[str, Any]) -> str:
    """Generate a Solidity-specific suggestion based on context."""
    try:
        current_line = context.get('currentLine', '')
        word_before = context.get('wordBeforeCursor', '')
        current_word = context.get('currentWord', '')
        
        # Check for partial keyword matches first
        if current_word:
            # Check keywords
            keyword_matches = [k for k in SOLIDITY_KEYWORDS.keys() if k.startswith(current_word.lower())]
            if keyword_matches:
                return SOLIDITY_KEYWORDS[keyword_matches[0]]
                
            # Check types
            type_matches = [t for t in SOLIDITY_TYPES.keys() if t.startswith(current_word.lower())]
            if type_matches:
                return SOLIDITY_TYPES[type_matches[0]]
                
            # Check function names
            func_matches = [f for f in SOLIDITY_FUNCTIONS.keys() if f.startswith(current_word.lower())]
            if func_matches:
                return SOLIDITY_FUNCTIONS[func_matches[0]]
        
        # Check for common patterns using precompiled regex
        for key, pattern in COMPILED_PATTERNS.items():
            if pattern.search(word_before):
                return SOLIDITY_PATTERNS[key]['suggestion']
        
        # Handle function parameters
        if '(' in word_before and ')' not in word_before:
            if 'transfer' in word_before.lower():
                return 'address recipient, uint256 amount'
            elif 'approve' in word_before.lower():
                return 'address spender, uint256 amount'
            elif 'mint' in word_before.lower():
                return 'address to, uint256 amount'
            elif 'burn' in word_before.lower():
                return 'uint256 amount'
            else:
                return 'address account, uint256 amount'
        
        # Handle variable declarations
        if ' ' in word_before:
            if 'address' in word_before.lower():
                return 'public owner'
            elif 'uint' in word_before.lower():
                return 'public totalSupply'
            elif 'mapping' in word_before.lower():
                return '(address => uint256) public balances'
            elif 'string' in word_before.lower():
                return 'public name'
            elif 'bool' in word_before.lower():
                return 'public isActive'
        
        return ''
    except Exception as e:
        logger.error(f"Error generating suggestion: {str(e)}", exc_info=True)
        return ''

if __name__ == "__main__":
    logger.info("Starting FastAPI server on port 8000")
    uvicorn.run(app, host="0.0.0.0", port=8000) 