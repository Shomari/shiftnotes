"""
Password reset views for user management
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.core.exceptions import ValidationError
from django.contrib.auth.password_validation import validate_password
from .email_service import EmailService
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset(request):
    """
    API endpoint to request password reset
    """
    email = request.data.get('email')
    
    if not email:
        return Response(
            {'error': 'Email address is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(email=email.lower().strip())
        
        # Send password reset email
        email_sent = EmailService.send_password_reset_email(user, request)
        
        if email_sent:
            return Response({
                'message': 'If an account with that email exists, a password reset link has been sent.',
                'success': True
            })
        else:
            return Response(
                {'error': 'Failed to send reset email. Please try again later.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except User.DoesNotExist:
        # For security, don't reveal whether the user exists or not
        return Response({
            'message': 'If an account with that email exists, a password reset link has been sent.',
            'success': True
        })


@api_view(['GET'])
@permission_classes([AllowAny])
def verify_reset_token(request, uidb64, token):
    """
    API endpoint to verify password reset token
    """
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        
        if default_token_generator.check_token(user, token):
            return Response({
                'valid': True,
                'user_id': user.id,
                'email': user.email,
                'name': user.name
            })
        else:
            return Response(
                {'valid': False, 'error': 'Invalid or expired reset token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'valid': False, 'error': 'Invalid reset link'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request, uidb64, token):
    """
    API endpoint to reset password with valid token
    """
    password = request.data.get('password')
    confirm_password = request.data.get('confirm_password')
    
    if not password or not confirm_password:
        return Response(
            {'error': 'Both password fields are required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if password != confirm_password:
        return Response(
            {'error': 'Passwords do not match'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = User.objects.get(pk=uid)
        
        if not default_token_generator.check_token(user, token):
            return Response(
                {'error': 'Invalid or expired reset token'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate password strength
        try:
            validate_password(password, user)
        except ValidationError as e:
            return Response(
                {'error': list(e.messages)}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Set new password
        user.set_password(password)
        user.save()
        
        logger.info(f"Password reset successful for user {user.email}")
        
        return Response({
            'message': 'Password has been reset successfully',
            'success': True
        })
        
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        return Response(
            {'error': 'Invalid reset link'}, 
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
def resend_welcome_email(request):
    """
    API endpoint for admins to resend welcome email to a user
    """
    from rest_framework.permissions import IsAuthenticated
    from django.contrib.auth.decorators import user_passes_test
    
    # Check if user is admin
    if not request.user.is_authenticated or request.user.role not in ['admin', 'system-admin']:
        return Response(
            {'error': 'Permission denied'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    user_id = request.data.get('user_id')
    
    if not user_id:
        return Response(
            {'error': 'User ID is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        user = User.objects.get(pk=user_id)
        
        # Send welcome email
        email_sent = EmailService.send_welcome_email(user, request)
        
        if email_sent:
            return Response({
                'message': f'Welcome email sent to {user.email}',
                'success': True
            })
        else:
            return Response(
                {'error': 'Failed to send welcome email. Please try again later.'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    except User.DoesNotExist:
        return Response(
            {'error': 'User not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
