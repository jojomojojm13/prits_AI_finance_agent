"""
agent.py — Core LangChain/LangGraph finance research agent from Prithvish Mukherjee.
"""

from langchain_community.utilities import WikipediaAPIWrapper
from langchain_community.tools import WikipediaQueryRun
from langchain_community.tools import YahooFinanceNewsTool
import os
import sqlite3
import functools
import uuid
from dotenv import load_dotenv
import yfinance as yf

from langchain_groq import ChatGroq
from langchain.tools import tool
from langchain.agents import create_agent
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_community.utilities import GoogleSerperAPIWrapper

load_dotenv()  # reads .env
serp = GoogleSerperAPIWrapper()

SYSTEM_PROMPT = """
You are FinBot, an expert equity research analyst with deep knowledge of financial markets,
valuation methodologies, and macroeconomic trends.

## Task
Given a stock ticker or company name, produce a concise, structured analyst brief that helps users evaluate the investment. Do not give buy/sell advice. Present data-driven signals only.

## Rules
1. Gather data before analysis. Never rely on memory for numbers.
2. If a tool fails or returns empty data, state it and proceed.
3. Never fabricate prices, ratios, or news.
4. Always follow the output format.
5. Flag notable risks or red flags.

## Output Format

**[TICKER] — Analyst Brief**
- 📊 **Fundamentals:** price, P/E, market cap, revenue growth (one line)
- 📈 **Valuation Signal:** OVERVALUED / FAIRLY VALUED / UNDERVALUED + reason
- 📰 **News Sentiment:** bullish / neutral / bearish + key headline
- ⚠️ **Key Risks:** 1–2 bullets
- 🧭 **Outlook:** 1–2 sentence synthesis, no advice
- **Recommendation:** BUY / SELL / HOLD
"""

# ---------------------------------------------------------------------------
# Tool definition
# ---------------------------------------------------------------------------

@tool
def get_stock_fundamentals(ticker: str) -> dict:
    """Get current stock price, P/E ratio, market cap, and revenue growth for a ticker via YahooFinance API."""
    stock = yf.Ticker(ticker)
    info = stock.info
    return {
        "price": info.get("currentPrice"),
        "pe_ratio": info.get("trailingPE"),
        "market_cap": info.get("marketCap"),
        "revenue_growth": info.get("revenueGrowth"),
        "52w_high": info.get("fiftyTwoWeekHigh"),
        "52w_low": info.get("fiftyTwoWeekLow"),
    }


@tool
def search_news(query: str) -> str:
    """
    Search last-24h Google News via SerperAPI.
    Returns news results with URLs.
    """
    return serp.run(query)

# ---------------------------------------------------------------------------
# Agent factory (cached — built once per process)
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=1)
def _build_agent():
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Please copy .env.example to .env and fill in the key."
        )
    conn = sqlite3.connect("finance_agent.db", check_same_thread=False)
    checkpointer = SqliteSaver(conn)
        

    llm = ChatGroq(
        model="openai/gpt-oss-20b",
        temperature=0,
        max_tokens=None,
        reasoning_format="parsed",
        timeout=None,
        max_retries=2,
        api_key=api_key,
    )


    tools = [
        get_stock_fundamentals,
        YahooFinanceNewsTool(),
        WikipediaQueryRun(api_wrapper=WikipediaAPIWrapper()),
        search_news
    ]
    _agent = create_agent(
        llm, 
        tools,
        system_prompt=SYSTEM_PROMPT,
        checkpointer=checkpointer
    )
    return _agent

agent = _build_agent()

# ---------------------------------------------------------------------------
# Public helper
# ---------------------------------------------------------------------------

def run_query(query: str, thread_id: str) -> str:
    """Run a natural-language query through Prit's Finance Agent and return the answer."""
    config = {"configurable": {"thread_id": thread_id}}
    result = agent.invoke({"messages": [{"role": "user", "content": query}]}, config)
    # result["messages"] is a list; the last message is the final AI answer
    messages = result.get("messages", [])
    if messages:
        last = messages[-1]
        # LangChain messages expose content via .content
        if hasattr(last, "content"):
            return last.content
        return str(last)
    return "No answer returned by Prit's Finance agent."
