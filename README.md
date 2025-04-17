# QRemix IDE with Solidity Features

A modern IDE for Solidity development with AI-powered code completion and suggestions.

## Features

- Static autocompletion for Solidity keywords, types, and snippets
- AI-powered ghost text completions (Tab to accept)
- Suggestion box for custom code generation
- Monaco Editor integration
- FastAPI backend with Groq integration

## Prerequisites

- Node.js (v16 or higher)
- Python (v3.8 or higher)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd q-remix-ide
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd ../backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# In backend/.env
GROQ_API_KEY=your_groq_api_key
```

## Running the Application

1. Start the backend server:
```bash
cd backend
python src/main.py
```

2. Start the frontend development server:
```bash
cd frontend
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:3000
```

## Usage

### Static Autocompletion
- Type Solidity keywords, types, or snippet triggers
- Press `.` after an object to see available members
- Use snippets by typing their trigger words (e.g., "contract", "function")

### AI Ghost Text
- Type code normally
- AI suggestions will appear as ghost text
- Press Tab to accept the suggestion

### Suggestion Box
- Press Ctrl+Shift+S to open the suggestion box
- Enter your prompt (e.g., "Add transfer function")
- Click "Get Suggestion" to generate code

## Development

### Frontend Structure
- `src/components/MonacoEditor.tsx`: Main editor component
- `src/components/SuggestionBox.tsx`: AI suggestion modal
- `src/config/solidity.ts`: Solidity language configuration

### Backend Structure
- `src/main.py`: FastAPI application
- `requirements.txt`: Python dependencies

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT