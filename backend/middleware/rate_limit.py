"""
Simple in-memory rate limiter for AI endpoints.
Prevents abuse of expensive Claude API calls.
"""
import time
from collections import defaultdict

# Track requests: IP → [(timestamp, ...)]
_requests: dict = defaultdict(list)

# Config
AI_RATE_LIMIT = 60  # max AI calls per minute
GENERAL_RATE_LIMIT = 300  # max general calls per minute
WINDOW_SECONDS = 60


def check_rate_limit(client_ip: str, is_ai: bool = False) -> bool:
    """Returns True if request is allowed, False if rate limited."""
    now = time.time()
    limit = AI_RATE_LIMIT if is_ai else GENERAL_RATE_LIMIT
    key = f"{'ai' if is_ai else 'gen'}:{client_ip}"
    
    # Clean old entries
    _requests[key] = [t for t in _requests[key] if now - t < WINDOW_SECONDS]
    
    if len(_requests[key]) >= limit:
        return False
    
    _requests[key].append(now)
    return True


def get_rate_info(client_ip: str) -> dict:
    """Get current rate limit status."""
    now = time.time()
    ai_key = f"ai:{client_ip}"
    gen_key = f"gen:{client_ip}"
    
    ai_count = len([t for t in _requests.get(ai_key, []) if now - t < WINDOW_SECONDS])
    gen_count = len([t for t in _requests.get(gen_key, []) if now - t < WINDOW_SECONDS])
    
    return {
        "ai_requests": ai_count,
        "ai_limit": AI_RATE_LIMIT,
        "general_requests": gen_count,
        "general_limit": GENERAL_RATE_LIMIT,
    }
