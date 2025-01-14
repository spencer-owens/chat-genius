from fastapi import Request, HTTPException
from time import time
from ..core.config import get_settings
from collections import defaultdict

settings = get_settings()

# Store request counts per IP
request_counts = defaultdict(list)

async def rate_limit_middleware(request: Request, call_next):
    # Get client IP
    client_ip = request.client.host
    current_time = time()
    
    # Clean old requests
    request_counts[client_ip] = [
        req_time for req_time in request_counts[client_ip]
        if current_time - req_time < settings.rate_limit_window
    ]
    
    # Check rate limit
    if len(request_counts[client_ip]) >= settings.rate_limit_requests:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Please try again later."
        )
    
    # Add current request
    request_counts[client_ip].append(current_time)
    
    # Process the request
    response = await call_next(request)
    return response
