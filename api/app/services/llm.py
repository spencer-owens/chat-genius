from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema import Document
from typing import List
import os
from dotenv import load_dotenv

# Load environment variables
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), '.env.local')
load_dotenv(env_path)

# Create the prompt template for answer generation
ANSWER_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """You are a helpful AI assistant that provides accurate answers based on the given context.
    Keep your answers concise and focused, approximately one paragraph long.
    If the context doesn't contain enough information to answer the question, say so.
    Do not make up information or use knowledge outside of the provided context."""),
    ("user", """Question: {question}

Context:
{context}

Please provide a concise answer based on this context.""")
])

def format_documents(docs: List[tuple[Document, float]]) -> str:
    """Format retrieved documents and their scores into a string."""
    formatted_docs = []
    for doc, score in docs:
        formatted_docs.append(f"[Score: {score:.2f}] {doc.page_content}")
    return "\n".join(formatted_docs)

def get_answer(question: str, retrieved_docs: List[tuple[Document, float]]) -> str:
    """
    Generate an answer using the retrieved documents as context.
    """
    # Initialize the LLM (tracing is automatic when LANGCHAIN_TRACING_V2=true)
    llm = ChatOpenAI(
        model="gpt-3.5-turbo",
        temperature=0
    )
    
    # Format the context from retrieved documents
    context = format_documents(retrieved_docs)
    
    # Create and run the chain
    chain = ANSWER_PROMPT | llm
    
    # Run with tracing
    result = chain.invoke({
        "question": question,
        "context": context
    })
    
    return result.content
