from cachetools import TTLCache
from .config import get_settings

settings = get_settings()

# Create a TTL cache with max size of 100 items and TTL from settings
cache = TTLCache(maxsize=100, ttl=settings.cache_ttl)

def get_cached_response(query: str) -> str | None:
    """Get cached response for a query if it exists."""
    return cache.get(query)

def cache_response(query: str, response: str) -> None:
    """Cache a response for a query."""
    cache[query] = response
