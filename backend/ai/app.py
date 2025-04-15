from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import requests
import os

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Define Pydantic models for request validation
class PromptData(BaseModel):
    code: str
    currentLine: str
    cursorPosition: int
    currentWord: str
    wordBeforeCursor: str
    isBeginningOfLine: bool
    isImporting: bool
    isPragma: bool
    isContract: bool
    isFunction: bool
    isEvent: bool
    isModifier: bool
    isMapping: bool
    isRequire: bool
    isOpenZeppelin: bool

class GenerateRequest(BaseModel):
    prompt: str
    promptData: Optional[PromptData]

# Groq API configuration
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "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")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.3-70b-versatile"  # Updated to a supported model

def create_prompt_from_context(prompt_data: PromptData) -> str:
    """Create a specific prompt based on the context."""
    
    # Extract context information
    code = prompt_data.code
    current_line = prompt_data.currentLine
    current_word = prompt_data.currentWord
    word_before_cursor = prompt_data.wordBeforeCursor
    
    # Base prompt template
    base_prompt = "You are a Solidity code completion assistant. Provide a concise, code-only completion suggestion for the following context:\n\n"
    
    # Add context-specific instructions
    if prompt_data.isImporting and "@" in current_line:
        return f"{base_prompt}Complete this OpenZeppelin import statement:\n{code}\nSuggestion should be a valid OpenZeppelin contract path."
    
    if prompt_data.isPragma:
        return f"{base_prompt}Complete this pragma statement:\n{code}\nSuggestion should be a valid Solidity version pragma."
    
    if prompt_data.isContract:
        return f"{base_prompt}Complete this contract declaration:\n{code}\nSuggestion should be a basic contract structure."
    
    if prompt_data.isFunction:
        return f"{base_prompt}Complete this function declaration:\n{code}\nSuggestion should include visibility and return type if applicable."
    
    if prompt_data.isEvent:
        return f"{base_prompt}Complete this event declaration:\n{code}\nSuggestion should include indexed parameters if appropriate."
    
    if prompt_data.isModifier:
        return f"{base_prompt}Complete this modifier declaration:\n{code}\nSuggestion should include parameters and basic checks."
    
    if prompt_data.isMapping:
        return f"{base_prompt}Complete this mapping declaration:\n{code}\nSuggestion should include key and value types."
    
    if prompt_data.isRequire:
        return f"{base_prompt}Complete this require statement:\n{code}\nSuggestion should include condition and error message."
    
    # Default prompt for general code completion
    return f"{base_prompt}Current code:\n{code}\n\nCurrent line:\n{current_line}\n\nProvide a completion suggestion that follows Solidity best practices."

@app.post("/generate")
async def generate_code(request: GenerateRequest):
    try:
        # Create context-aware prompt
        if request.promptData:
            full_prompt = create_prompt_from_context(request.promptData)
        else:
            full_prompt = f"Complete this Solidity code:\n{request.prompt}"
        
        headers = {
            "Authorization": f"Bearer {GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": MODEL_NAME,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a Solidity code completion assistant. Provide only code completions, no explanations. Focus on writing secure, gas-efficient, and best-practice Solidity code."
                },
                {
                    "role": "user",
                    "content": full_prompt
                }
            ],
            "max_tokens": 1000,
            "temperature": 0.3,  # Lower temperature for more focused suggestions
            "top_p": 0.95,
            "stream": False,
            "presence_penalty": 0,
            "frequency_penalty": 0
        }
        
        print("Sending request to Groq API with data:", data)  # Debug log
        response = requests.post(GROQ_API_URL, headers=headers, json=data)
        print("Response status:", response.status_code)  # Debug log
        print("Response content:", response.text)  # Debug log
        
        response.raise_for_status()
        result = response.json()
        
        if "choices" not in result or not result["choices"]:
            raise Exception("No completion choices in response")
            
        completion = result["choices"][0]["message"]["content"]
        suggestion = completion.strip()
        
        # Clean up the suggestion
        suggestion = suggestion.replace("```solidity", "").replace("```", "").strip()
        
        # Remove any prose or explanations, keep only code
        suggestion_lines = suggestion.split("\n")
        code_lines = [line for line in suggestion_lines if not line.startswith("//") and line.strip()]
        suggestion = "\n".join(code_lines)
        
        return {"suggestion": suggestion}
    except requests.exceptions.RequestException as e:
        print(f"API request error: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Error response: {e.response.text}")  # Debug log
        return {"error": f"API request failed: {str(e)}"}
    except Exception as e:
        print(f"Error generating code: {str(e)}")
        return {"error": f"Failed to generate suggestion: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)






