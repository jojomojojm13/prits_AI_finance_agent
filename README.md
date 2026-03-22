# Finance Research Agent — Getting Started

## Architecture

```
Day_05/
├── backend/        # FastAPI + LangChain/LangGraph agent
│   ├── agent.py        ← Core LangGraph agent + yfinance tool
│   ├── main.py         ← FastAPI app (/health, /query)
│   ├── requirements.txt
│   └── .env.example
└── frontend/       # Next.js chat UI
    ├── pages/
    │   ├── index.tsx   ← Chat page (sends queries, renders markdown)
    │   ├── _app.tsx
    │   └── _document.tsx
    ├── styles/
    │   └── chat.css
    └── package.json
```

## Backend Setup

```bash
cd Day_05/backend

# 1. Copy and fill in your Groq API key
cp .env.example .env
#    Edit .env and set GROQ_API_KEY=<your_key>
#    and set SERPER_API_KEY=<your_key>
#    Get your key at: https://console.groq.com/keys
#    Get your key at: https://serper.dev/api-keys

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the server (default port 8000)
uvicorn main:app --reload --port 8000
```

**Endpoints:**
- `GET  http://localhost:8000/health` → `{"status":"ok"}`
- `POST http://localhost:8000/query`  → body: `{"query":"..."}` → `{"answer":"..."}`

## Frontend Setup

```bash
cd Day_05/frontend

npm install
npm run dev
```

Open **http://localhost:3000** in your browser.

## Usage

Type a financial question into the chat box and press **Enter** (or click **Send**).  
Examples:
- *How is NVIDIA doing financially?*
- *Compare Apple and Microsoft stock fundamentals.*
- *What is Tesla's current P/E ratio?*

The agent will use Yahoo Finance under the hood and format its answer with headings, bullet points, and tables.

Or Ask Questions:
1.Give me a quick brief on INFY
2.Also Give me a quick brief on WIPRO
3.How does both compare to TCS on valuation?
4.Given all 3, which has better growth prospects?
