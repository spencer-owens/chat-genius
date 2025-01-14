from langchain import hub
from langchain_openai import ChatOpenAI
from langchain_core.output_parsers import StrOutputParser
from langchain.load import dumps, loads
from typing import List
from langchain.schema import Document
import os
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env.local')
load_dotenv(env_path)

def get_query_generator():
    """Get the query generation chain."""
    # Load the RAG fusion query generation prompt
    prompt = hub.pull("langchain-ai/rag-fusion-query-generation")
    
    # Create the chain (tracing is automatic when LANGCHAIN_TRACING_V2=true)
    llm = ChatOpenAI(temperature=0)
    
    return (
        prompt 
        | llm
        | StrOutputParser() 
        | (lambda x: x.split("\n"))
    )

def reciprocal_rank_fusion(results: List[List[Document]], k: int = 60) -> List[tuple[Document, float]]:
    """
    Perform reciprocal rank fusion on multiple lists of retrieved documents.
    
    Args:
        results: List of lists of retrieved documents
        k: Constant to prevent division by zero and smooth rankings
        
    Returns:
        List of (document, score) tuples, sorted by score in descending order
    """
    fused_scores = {}
    
    # Calculate fusion scores
    for docs in results:
        for rank, doc in enumerate(docs):
            doc_str = dumps(doc)
            if doc_str not in fused_scores:
                fused_scores[doc_str] = 0
            fused_scores[doc_str] += 1 / (rank + k)
    
    # Sort by score and convert back to documents
    reranked_results = [
        (loads(doc), score)
        for doc, score in sorted(fused_scores.items(), key=lambda x: x[1], reverse=True)
    ]
    
    return reranked_results
