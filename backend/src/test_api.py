import requests
import json

def test_api():
    url = "http://localhost:8000/api/completion"
    data = {
        "prompt": "test",
        "promptData": {
            "code": "contract Test {",
            "currentLine": "contract Test {",
            "cursorPosition": 13,
            "currentWord": "Test",
            "wordBeforeCursor": "contract ",
            "isBeginningOfLine": False,
            "isImporting": False,
            "isPragma": False,
            "isContract": True,
            "isFunction": False,
            "isEvent": False,
            "isModifier": False,
            "isMapping": False,
            "isRequire": False,
            "isOpenZeppelin": False
        }
    }
    
    try:
        print("Making request to:", url)
        print("Request data:", json.dumps(data, indent=2))
        
        response = requests.post(url, json=data)
        print("Response status:", response.status_code)
        print("Response headers:", response.headers)
        print("Response content:", response.text)
        
        if response.status_code == 200:
            result = response.json()
            print("Parsed response:", json.dumps(result, indent=2))
        else:
            print("Error:", response.text)
    except Exception as e:
        print("Exception:", str(e))

if __name__ == "__main__":
    test_api() 