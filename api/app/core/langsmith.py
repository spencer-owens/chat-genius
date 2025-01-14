from langsmith import Client
import os
from dotenv import load_dotenv

def init_langsmith():
    """Initialize LangSmith client and create project if it doesn't exist."""
    try:
        # Load environment variables from the root .env.local file
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), '.env.local')
        load_dotenv(env_path)
        
        # Log configuration for debugging
        api_key = os.getenv("LANGCHAIN_API_KEY", "")
        project = os.getenv("LANGCHAIN_PROJECT", "default")
        print(f"LangChain Configuration:")
        print(f"API Key (first 10 chars): {api_key[:10]}...")
        print(f"Project: {project}")
        print(f"Tracing Enabled: {os.getenv('LANGCHAIN_TRACING_V2')}")
        
        # Initialize client (will use environment variables automatically)
        client = Client()
        
        # Verify connection by listing projects
        projects = client.list_projects()
        print(f"Successfully connected to LangSmith. Found {len(projects)} projects.")
                
    except Exception as e:
        print(f"Warning: Failed to initialize LangSmith: {str(e)}") 