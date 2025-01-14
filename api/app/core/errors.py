from fastapi import HTTPException
from typing import Dict, Any

class RAGError(HTTPException):
    """Base error class for RAG-related errors."""
    def __init__(self, detail: str, status_code: int = 500):
        super().__init__(status_code=status_code, detail=detail)

class VectorStoreError(RAGError):
    """Raised when there's an error with the vector store operations."""
    def __init__(self, detail: str):
        super().__init__(detail=f"Vector store error: {detail}", status_code=503)

class QueryGenerationError(RAGError):
    """Raised when query generation fails."""
    def __init__(self, detail: str):
        super().__init__(detail=f"Query generation failed: {detail}", status_code=500)

class LLMError(RAGError):
    """Raised when the LLM call fails."""
    def __init__(self, detail: str):
        super().__init__(detail=f"LLM error: {detail}", status_code=503)

def format_error_response(error: Exception) -> Dict[str, Any]:
    """Format error response for API."""
    if isinstance(error, RAGError):
        return {
            "error": error.detail,
            "type": error.__class__.__name__,
            "status_code": error.status_code
        }
    return {
        "error": str(error),
        "type": "UnexpectedError",
        "status_code": 500
    } 