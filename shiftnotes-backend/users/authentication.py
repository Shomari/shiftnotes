"""
Custom authentication with session timeout.
Implements hospital security requirement AU-15 (15-minute inactivity timeout).

This module provides a custom token authentication class that tracks
user activity and expires sessions after 15 minutes of inactivity.
"""
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.core.cache import cache
from django.utils import timezone
from datetime import timedelta

# Session timeout configuration (15 minutes as per hospital requirement)
SESSION_TIMEOUT_MINUTES = 15


class ExpiringTokenAuthentication(TokenAuthentication):
    """
    Token authentication with 15-minute inactivity timeout.
    
    This authentication class extends the default TokenAuthentication
    to track user activity and expire sessions after a period of inactivity.
    
    The last activity timestamp is stored in Django's cache, which is
    checked on each authenticated request. If the time since last activity
    exceeds the timeout threshold, the session is considered expired.
    """
    
    def authenticate_credentials(self, key):
        """
        Authenticate the token and check for session expiration.
        
        Args:
            key: The authentication token key
            
        Returns:
            tuple: (user, token) if authentication succeeds
            
        Raises:
            AuthenticationFailed: If token is invalid, user is inactive,
                                  or session has expired
        """
        model = self.get_model()
        
        try:
            token = model.objects.select_related('user').get(key=key)
        except model.DoesNotExist:
            raise AuthenticationFailed('Invalid token.')

        if not token.user.is_active:
            raise AuthenticationFailed('User inactive or deleted.')
        
        # Check for deactivated users (custom deactivation field)
        if hasattr(token.user, 'deactivated_at') and token.user.deactivated_at is not None:
            raise AuthenticationFailed('User account has been deactivated.')

        # Check session activity timeout
        cache_key = f'token_last_activity_{token.key}'
        last_activity = cache.get(cache_key)
        
        if last_activity:
            time_since_activity = timezone.now() - last_activity
            if time_since_activity > timedelta(minutes=SESSION_TIMEOUT_MINUTES):
                # Clear the cache entry for the expired session
                cache.delete(cache_key)
                raise AuthenticationFailed(
                    f'Session expired due to {SESSION_TIMEOUT_MINUTES} minutes of inactivity. '
                    'Please log in again.'
                )
        
        # Update last activity timestamp
        # Cache for longer than timeout to ensure it persists between checks
        cache.set(cache_key, timezone.now(), SESSION_TIMEOUT_MINUTES * 60 * 2)
        
        return (token.user, token)


def clear_session_activity(token_key):
    """
    Clear the session activity cache for a token.
    Call this when a user logs out.
    
    Args:
        token_key: The authentication token key
    """
    cache_key = f'token_last_activity_{token_key}'
    cache.delete(cache_key)

