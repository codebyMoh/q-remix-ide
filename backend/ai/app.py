from fastapi import FastAPI
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from pydantic import BaseModel  # Add this for body parsing

app = FastAPI()

# Define a Pydantic model for the request body
class GenerateRequest(BaseModel):
    prompt: str

# Load TinyLlama model
model_name = "TinyLlama/TinyLlama-1.1B-Chat-v1.0"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(model_name, torch_dtype=torch.float16)
device = "cuda" if torch.cuda.is_available() else "cpu"
model.to(device)

@app.post("/generate")
async def generate_code(request: GenerateRequest):  # Use the Pydantic model
    prompt = request.prompt  # Extract prompt from the body
    full_prompt = f"Complete this code: ```solidity\n{prompt}\n```"
    inputs = tokenizer(full_prompt, return_tensors="pt").to(device)
    outputs = model.generate(
        inputs["input_ids"],
        max_new_tokens=50,
        temperature=0.7,
        do_sample=True
    )
    suggestion = tokenizer.decode(outputs[0], skip_special_tokens=True)
    return {"suggestion": suggestion[len(full_prompt):].strip()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)