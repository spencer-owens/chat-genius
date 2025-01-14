from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.models import QuestionRequest, AIResponse, RetrievedDocument
from app.middleware.rate_limit import rate_limit_middleware
from app.core.cache import get_cached_response, cache_response
from app.services.embeddings import get_vectorstore, get_retriever
from app.services.query_gen import get_query_generator, reciprocal_rank_fusion
from app.services.llm import get_answer
from app.core.errors import RAGError, VectorStoreError, QueryGenerationError, LLMError, format_error_response
from app.core.logging import logger
from app.core.langsmith import init_langsmith
import time
from typing import Callable
import traceback

app = FastAPI(title="Chat Genius RAG API")

# Initialize LangSmith
init_langsmith()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js development server
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Add rate limiting middleware
app.middleware("http")(rate_limit_middleware)

@app.middleware("http")
async def logging_middleware(request: Request, call_next: Callable):
    """Log request and response details."""
    start_time = time.time()
    
    # Log request
    logger.info(
        "Incoming request",
        extra={
            "path": request.url.path,
            "method": request.method,
            "client_ip": request.client.host
        }
    )
    
    try:
        response = await call_next(request)
        
        # Log response
        logger.info(
            "Request completed",
            extra={
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round((time.time() - start_time) * 1000, 2)
            }
        )
        return response
        
    except Exception as e:
        # Log error
        logger.error(
            "Request failed",
            extra={
                "path": request.url.path,
                "error": str(e),
                "traceback": traceback.format_exc(),
                "duration_ms": round((time.time() - start_time) * 1000, 2)
            }
        )
        raise

@app.exception_handler(RAGError)
async def rag_error_handler(request: Request, error: RAGError):
    """Handle RAG-specific errors."""
    return JSONResponse(
        status_code=error.status_code,
        content=format_error_response(error)
    )

@app.exception_handler(Exception)
async def general_error_handler(request: Request, error: Exception):
    """Handle unexpected errors."""
    return JSONResponse(
        status_code=500,
        content=format_error_response(error)
    )

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/ask", response_model=AIResponse)
async def ask_question(request: QuestionRequest):
    logger.info(
        "Processing question",
        extra={"question": request.question, "user_id": request.user_id}
    )
    
    try:
        # Check cache first
        cached = get_cached_response(request.question)
        if cached:
            logger.info("Returning cached response")
            # Remove cached field if it exists in the cached data
            if 'cached' in cached:
                del cached['cached']
            return AIResponse(**cached, cached=True)
        
        # Get services
        try:
            vectorstore = get_vectorstore()
            retriever = get_retriever(vectorstore)
        except Exception as e:
            raise VectorStoreError(str(e))
        
        # Generate multiple queries
        try:
            query_generator = get_query_generator()
            queries = query_generator.invoke({"original_query": request.question})
            logger.info("Generated queries", extra={"queries": queries})
        except Exception as e:
            raise QueryGenerationError(str(e))
        
        # Get documents for each query
        results = []
        for query in queries:
            try:
                docs = retriever.get_relevant_documents(query)
                results.append(docs)
            except Exception as e:
                raise VectorStoreError(f"Failed to retrieve documents for query '{query}': {str(e)}")
        
        # Rerank documents
        reranked_docs = reciprocal_rank_fusion(results)
        logger.info(
            "Retrieved and reranked documents",
            extra={"num_docs": len(reranked_docs)}
        )
        
        # Generate answer
        try:
            answer = get_answer(request.question, reranked_docs)
        except Exception as e:
            raise LLMError(str(e))
        
        # Format response
        response = AIResponse(
            answer=answer,
            sources=[
                RetrievedDocument(content=doc.page_content, score=score)
                for doc, score in reranked_docs[:3]  # Include top 3 sources
            ],
            cached=False
        )
        
        # Cache the response
        cache_response(request.question, response.model_dump())
        
        logger.info("Successfully generated response")
        return response
        
    except Exception as e:
        logger.error(
            "Failed to process question",
            extra={
                "error": str(e),
                "traceback": traceback.format_exc()
            }
        )
        raise

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
