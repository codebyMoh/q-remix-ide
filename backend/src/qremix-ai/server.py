from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
from groq import Groq
from dotenv import load_dotenv
from typing import List, Dict
import re
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
PORT = int(os.getenv("PORT", 5000))

# Initialize FastAPI app and Groq client
app = FastAPI(title="QRemix AI Assistant - Llama3 on Groq")
client = Groq(api_key=GROQ_API_KEY)

# Add CORS middleware to handle preflight OPTIONS requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js frontend origin
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],  # Explicitly allow OPTIONS
    allow_headers=["*"],
)

# In-memory chat history - store all messages
chat_history: List[Dict[str, str]] = []
# Only use this many messages for context in API calls to manage token limits
MAX_CONTEXT_MESSAGES = 5
# But store up to this many messages for display purposes
MAX_STORED_MESSAGES = 100

SYSTEM_PROMPT = (
    "You are QRemix AI, a coding assistant for Solidity, Python, and JavaScript. "
    "Provide concise, accurate responses with NO internal reasoning, thinking steps, or extra commentary. "
    "Do NOT include '<think>' or similar tags in your response. "
    "Format code blocks with triple backticks and language name (```python, ```solidity, ```javascript). "
    "For emphasis, use **bold text** or *italic text* properly with no spaces between asterisks and text. "
    "For section headers use markdown (### Header). "
    "For greetings like 'hi', respond with 'I am QRemix AI, how may I help you today?'. "
    "For code generation (e.g., 'write a function'), return only the code in a markdown block "
    "followed by an **Explanation** section. For debugging (e.g., 'debug this'), return the corrected "
    "code in a markdown block followed by an **Explanation** section. Use markdown for code blocks."
)

def clean_response(response: str) -> str:
    return re.sub(r'<think>.*?</think>', '', response, flags=re.DOTALL).strip()

def get_groq_llama_response(prompt: str) -> str:
    chat_history.append({"role": "user", "content": prompt})
    if len(chat_history) > MAX_STORED_MESSAGES:
        chat_history[:] = chat_history[-MAX_STORED_MESSAGES:]
    
    # Use only the most recent messages for context
    context_messages = chat_history[-MAX_CONTEXT_MESSAGES:]
    
    # Prepare messages for API call
    messages = [{"role": "system", "content": SYSTEM_PROMPT}] + context_messages
    
    try:
        chat_completion = client.chat.completions.create(
            messages=messages,
            model="llama3-8b-8192",  # Llama3 model
            max_tokens=2000,  # Increased token limit
            temperature=0.5,
            timeout=30,  # Increased timeout
        )
        response = chat_completion.choices[0].message.content
        cleaned_response = clean_response(response)
        chat_history.append({"role": "assistant", "content": cleaned_response})
        return cleaned_response
    except Exception as e:
        error_message = f"Error: {str(e)}"
        chat_history.append({"role": "assistant", "content": error_message})
        return error_message

class ChatRequest(BaseModel):
    message: str

@app.post("/chat", response_model=dict)
async def chat(request: ChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Check if the incoming message is too long
    if len(request.message) > 4000:
        return {"response": "Your message is too long. Please keep it under 4000 characters.", "chat_history": chat_history}
    
    response = get_groq_llama_response(request.message)
    # Return the full chat history for display
    return {"response": response, "chat_history": chat_history}

@app.post("/clear", response_model=dict)
async def clear_history():
    chat_history.clear()
    return {"message": "Chat history cleared"}

@app.get("/health", response_model=dict)
async def health_check():
    return {"status": "healthy", "model": "llama3-8b-8192"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)