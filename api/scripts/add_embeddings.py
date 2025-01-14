import os
from dotenv import load_dotenv
from langchain_openai import OpenAIEmbeddings
from pinecone import Pinecone, ServerlessSpec
from pathlib import Path

# Get absolute path to .env.local
api_dir = Path(__file__).resolve().parent.parent
env_path = api_dir / ".env.local"
print(f"Loading environment from: {env_path}")

# Load environment variables
load_dotenv(env_path)

# Debug: Print API key (first few characters)
api_key = os.getenv("PINECONE_API_KEY")
print(f"Using Pinecone API key: {api_key[:10]}...")

# Initialize Pinecone
pc = Pinecone(api_key=api_key)

# Parkour documents
all_documents = {
    "doc1": "The History of Parkour: From Military Training to Urban Sport.",
    "doc2": "Fundamental Movements in Parkour: Rolls, Vaults, and Climbs.",
    "doc3": "The Philosophy of Parkour: Freedom and Efficiency.",
    "doc4": "Parkour vs. Freerunning: Understanding the Differences.",
    "doc5": "Training for Parkour: Strength, Agility, and Endurance.",
    "doc6": "Iconic Parkour Practitioners and Their Contributions.",
    "doc7": "Parkour as a Discipline: Mental and Physical Benefits.",
    "doc8": "Safety in Parkour: Techniques to Prevent Injuries.",
    "doc9": "Urban Landscapes and Their Role in Parkour Training.",
    "doc10": "Parkour for Beginners: Tips to Start Your Journey.",
    "doc11": "Advanced Parkour Techniques: Precision Jumps and Wall Runs.",
    "doc12": "Parkour Competitions: From Local Meets to Global Events.",
    "doc13": "The Role of Creativity in Parkour Performance.",
    "doc14": "Parkour Gear: Shoes, Clothing, and Accessories.",
    "doc15": "Parkour as a Fitness Routine: Full-Body Workouts.",
    "doc16": "The Parkour Community: Building Connections Worldwide.",
    "doc17": "The Science of Movement: Physics in Parkour.",
    "doc18": "Parkour in Popular Culture: Movies, Games, and Media.",
    "doc19": "Adapting Parkour for Natural Environments.",
    "doc20": "Mental Toughness in Parkour: Overcoming Fear.",
    "doc21": "The Ethics of Parkour: Respecting Spaces and Communities.",
    "doc22": "Female Athletes in Parkour: Breaking Stereotypes.",
    "doc23": "The Evolution of Parkour Training Techniques.",
    "doc24": "Parkour Academies: Structured Learning for All Ages.",
    "doc25": "Urban Art and Parkour: Blending Creativity with Movement.",
    "doc26": "Parkour and Mindfulness: Staying Present During Movement.",
    "doc27": "Parkour for Kids: Building Confidence and Agility Early.",
    "doc28": "The Role of Social Media in Parkour's Growth.",
    "doc29": "Overcoming Challenges in Parkour: Stories from Practitioners.",
    "doc30": "Parkour as a Lifestyle: Integrating Movement into Daily Life.",
}

def main():
    print("Creating embeddings and uploading to Pinecone...")
    
    # Initialize OpenAI embeddings
    embeddings = OpenAIEmbeddings()
    
    # Get the index
    index = pc.Index("rad-rag")
    
    # Create embeddings and upsert to Pinecone
    for doc_id, text in all_documents.items():
        vector = embeddings.embed_query(text)
        index.upsert([(doc_id, vector, {"text": text})])
        print(f"Added {doc_id}")
    
    print("Done! Embeddings have been added to the rad-rag index.")

if __name__ == "__main__":
    main() 