"""
main.py — FastAPI application exposing /health and /query endpoints.
Run with:  uvicorn main:app --reload --port 8000
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import uuid
from agent import run_query


app = FastAPI(
    title="Finance Research Agent",
    description="LangChain/LangGraph powered finance agent backed by Groq LLM.",
    version="1.0.0",
)

# Allow the Next.js dev server (and any localhost origin) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class QueryRequest(BaseModel):
    query: str
    thread_id: str = Field(default_factory=lambda: str(uuid.uuid4()))


class QueryResponse(BaseModel):
    answer: str


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """Simple liveness check."""
    return {"status": "ok"}


@app.post("/query", response_model=QueryResponse)
def query(req: QueryRequest):
    """
    Pass a natural-language financial question to the LangGraph agent and
    return its answer.
    """
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="query must not be empty")

    try:
        answer = run_query(req.query.strip(), req.thread_id)
    except RuntimeError as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    return QueryResponse(answer=answer)
