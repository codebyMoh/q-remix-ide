from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Optional, Dict, Any, List
import logging
import time
from functools import lru_cache

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
        'suggestion': 'ContractName {\n    // Contract code here\n}'
    },
    'function': {
        'pattern': r'function\s+\w+\s*\(',
        'suggestion': 'function name() public {\n    // Function code here\n}'
    },
    'event': {
        'pattern': r'event\s+\w+\s*\(',
        'suggestion': 'event EventName(\n    address indexed from,\n    uint256 value\n);'
    },
    'mapping': {
        'pattern': r'mapping\s*\(',
        'suggestion': 'mapping(address => uint256) public balances;'
    },
    'require': {
        'pattern': r'require\s*\(',
        'suggestion': 'require(condition, "Error message");'
    },
    'import': {
        'pattern': r'import\s+',
        'suggestion': 'import "@openzeppelin/contracts/access/Ownable.sol";'
    },
    'pragma': {
        'pattern': r'pragma\s+',
        'suggestion': 'pragma solidity ^0.8.0;'
    },
    'modifier': {
        'pattern': r'modifier\s+\w+\s*\(',
        'suggestion': 'modifier onlyOwner() {\n    require(msg.sender == owner(), "Not owner");\n    _;\n}'
    },
    'struct': {
        'pattern': r'struct\s+\w+\s*{',
        'suggestion': 'struct Data {\n    uint256 id;\n    string name;\n}'
    },
    'enum': {
        'pattern': r'enum\s+\w+\s*{',
        'suggestion': 'enum Status {\n    Pending,\n    Active,\n    Completed\n}'
    }
}

# Cache for storing recent completions
@lru_cache(maxsize=100)
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
            'isOpenZeppelin': request.promptData.get('isOpenZeppelin', False)
        }
        
        # Check cache first
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
    current_line = context['currentLine']
    word_before = context['wordBeforeCursor']
    
    # Check for common patterns
    for key, pattern_data in SOLIDITY_PATTERNS.items():
        if pattern_data['pattern'] in word_before.lower():
            return pattern_data['suggestion']
    
    # Handle variable declarations
    if ' ' in word_before and not any(keyword in word_before.lower() for keyword in ['function', 'event', 'modifier']):
        # Check if it's a state variable
        if context['isBeginningOfLine']:
            return 'uint256 public variableName;'
        return 'variableName;'
    
    # Handle function parameters
    if '(' in word_before and ')' not in word_before:
        return 'address _address, uint256 _amount'
    
    # Handle OpenZeppelin imports
    if context['isImporting']:
        return '@openzeppelin/contracts/access/Ownable.sol'
    
    # Handle pragma
    if context['isPragma']:
        return 'solidity ^0.8.0;'
    
    return ''

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000) 