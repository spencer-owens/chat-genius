from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv
from pathlib import Path

# Get the API directory path and load .env.local from there
api_dir = Path(__file__).resolve().parent.parent.parent
load_dotenv(api_dir / ".env.local")

class Settings(BaseSettings):
    # OpenAI
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    
    # Pinecone
    pinecone_api_key: str = os.getenv("PINECONE_API_KEY", "")
    pinecone_index: str = os.getenv("PINECONE_INDEX_TWO", "")  # Using the RAG fusion index
    pinecone_environment: str = os.getenv("PINECONE_ENVIRONMENT", "")
    
    # Rate Limiting
    rate_limit_requests: int = 10
    rate_limit_window: int = 60  # seconds
    
    # Cache
    cache_ttl: int = 3600  # 1 hour in seconds

@lru_cache()
def get_settings():
    return Settings()
