"""
Login attempt tracking and account lockout functionality.
Implements hospital security requirement AU-13.

Uses Django's cache framework for tracking login attempts.
Locks out accounts after 5 failed login attempts for 1 hour.
"""
from django.core.cache import cache
from django.conf import settings

# Configuration
LOCKOUT_THRESHOLD = 5  # Number of failed attempts before lockout
LOCKOUT_DURATION = 3600  # Lockout duration in seconds (1 hour)


def get_cache_key(email):
    """Generate a consistent cache key for an email address."""
    return f'login_attempts_{email.lower()}'


def check_login_attempts(email):
    """
    Check if an account is locked out due to too many failed attempts.
    
    Args:
        email: The email address to check
        
    Returns:
        tuple: (allowed: bool, message: str or None)
            - allowed: True if login attempt is allowed, False if locked out
            - message: Error message if locked out, None otherwise
    """
    cache_key = get_cache_key(email)
    attempts = cache.get(cache_key, 0)
    
    if attempts >= LOCKOUT_THRESHOLD:
        return False, f'Account locked due to {LOCKOUT_THRESHOLD} failed login attempts. Please try again in 1 hour.'
    
    return True, None


def record_failed_attempt(email):
    """
    Record a failed login attempt for an email address.
    
    Args:
        email: The email address that failed to login
        
    Returns:
        str: Warning message about remaining attempts or lockout status
    """
    cache_key = get_cache_key(email)
    attempts = cache.get(cache_key, 0)
    new_attempts = attempts + 1
    cache.set(cache_key, new_attempts, LOCKOUT_DURATION)
    
    remaining = LOCKOUT_THRESHOLD - new_attempts
    if remaining > 0:
        return f'{remaining} attempt(s) remaining before account lockout'
    return 'Account locked for 1 hour due to too many failed attempts'


def reset_login_attempts(email):
    """
    Reset the failed login attempt counter after a successful login.
    
    Args:
        email: The email address to reset
    """
    cache_key = get_cache_key(email)
    cache.delete(cache_key)


def get_remaining_attempts(email):
    """
    Get the number of remaining login attempts before lockout.
    
    Args:
        email: The email address to check
        
    Returns:
        int: Number of remaining attempts (0-5)
    """
    cache_key = get_cache_key(email)
    attempts = cache.get(cache_key, 0)
    return max(0, LOCKOUT_THRESHOLD - attempts)

