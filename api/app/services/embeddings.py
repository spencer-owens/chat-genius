from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Pinecone
from ..core.config import get_settings
from pinecone import Pinecone as PineconeClient

settings = get_settings()

def get_vectorstore():
    """Get or create a connection to the Pinecone vector store."""
    embeddings = OpenAIEmbeddings()
    
    # Initialize Pinecone client
    pc = PineconeClient(api_key=settings.pinecone_api_key)
    
    # Get the index
    index = pc.Index(settings.pinecone_index)
    
    return Pinecone.from_existing_index(
        index_name=settings.pinecone_index,
        embedding=embeddings,
        namespace=""  # Optional namespace parameter
    )

def get_retriever(vectorstore=None):
    """Get a retriever instance for similarity search."""
    if vectorstore is None:
        vectorstore = get_vectorstore()
    return vectorstore.as_retriever()
