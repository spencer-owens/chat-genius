from pydantic import BaseModel, Field
from typing import List, Optional

class QuestionRequest(BaseModel):
    """Request model for the /ask endpoint."""
    question: str = Field(
        ...,  # ... means required
        min_length=1,
        max_length=500,
        description="The question to ask the AI"
    )
    user_id: Optional[str] = Field(
        None,
        description="Optional user ID for rate limiting"
    )

class RetrievedDocument(BaseModel):
    """Model for a retrieved document with its relevance score."""
    content: str = Field(..., description="The document content")
    score: float = Field(..., description="The relevance score")

class AIResponse(BaseModel):
    """Response model for the /ask endpoint."""
    answer: str = Field(..., description="The AI-generated answer")
    sources: List[RetrievedDocument] = Field(
        ...,
        description="The source documents used to generate the answer"
    )
    cached: bool = Field(
        False,
        description="Whether this response was served from cache"
    ) 