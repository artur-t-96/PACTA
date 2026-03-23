"""
RAG Service — ChromaDB + VoyageAI for legal risk assessment
"""
import os
import chromadb
import voyageai
from typing import List

CHROMADB_PATH = os.getenv("CHROMADB_PATH", "/var/data/chromadb")
VOYAGE_API_KEY = os.getenv("VOYAGE_API_KEY", "")
COLLECTION_NAME = "legal_pl"


def _get_client():
    return chromadb.PersistentClient(path=CHROMADB_PATH)


def _get_collection():
    client = _get_client()
    try:
        return client.get_collection(COLLECTION_NAME)
    except Exception:
        # Collection doesn't exist — return None
        return None


def search_legal_context(query: str, n_results: int = 3) -> List[str]:
    """
    Search ChromaDB for relevant legal provisions.
    Returns list of relevant text snippets.
    """
    collection = _get_collection()
    
    if collection is None:
        # No legal DB populated yet — return empty
        return []
    
    try:
        # Use VoyageAI for embeddings
        vo = voyageai.Client(api_key=VOYAGE_API_KEY)
        query_embedding = vo.embed([query], model="voyage-3-lite", input_type="query").embeddings[0]
        
        results = collection.query(
            query_embeddings=[query_embedding],
            n_results=n_results,
        )
        
        documents = results.get("documents", [[]])[0]
        return documents
        
    except Exception as e:
        print(f"RAG search error: {e}")
        return []


def get_collection_stats() -> dict:
    """Get stats about the legal_pl collection."""
    collection = _get_collection()
    if collection is None:
        return {"exists": False, "count": 0}
    try:
        return {"exists": True, "count": collection.count()}
    except Exception:
        return {"exists": True, "count": -1}
