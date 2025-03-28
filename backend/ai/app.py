from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
app = FastAPI()
# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Define a Pydantic model for the request body
class GenerateRequest(BaseModel):
    prompt: str
# Groq API configuration
GROQ_API_KEY = "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"
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = "llama-3.3-70b-versatile"  # Updated to a supported model
@app.post("/generate")
async def generate_code(request: GenerateRequest):
    prompt = request.prompt
    full_prompt = f"Complete this code: ```solidity\n{prompt}\n```"
    
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL_NAME,
        "messages": [
            {
                "role": "user",
                "content": full_prompt
            }
        ],
        "max_tokens": 1000,
        "temperature": 0.7,
        "top_p": 0.95,
        "stream": False,
        "presence_penalty": 0,
        "frequency_penalty": 0
    }
    
    try:
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
        
        # Remove the prompt from the suggestion if present
        if suggestion.startswith(full_prompt):
            suggestion = suggestion[len(full_prompt):].strip()
            
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






