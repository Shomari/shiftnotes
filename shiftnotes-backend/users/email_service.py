"""
Email service for user management functionality
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.urls import reverse
from .email_templates import get_welcome_email_template, get_password_reset_email_template
import logging

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending user management emails"""
    
    @staticmethod
    def get_password_reset_link(user, request=None):
        """Generate password reset link for user"""
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # For development, use a simple frontend URL
        # In production, this would be your actual frontend domain
        if request:
            domain = request.get_host()
            protocol = 'https' if request.is_secure() else 'http'
        else:
            # Fallback for when no request context (e.g., management commands)
            domain = getattr(settings, 'FRONTEND_DOMAIN', 'localhost:8081')
            protocol = 'http'  # Change to https in production
        
        reset_url = f"{protocol}://{domain}/reset-password/{uid}/{token}/"
        return reset_url
    
    @staticmethod
    def send_welcome_email(user, request=None):
        """Send welcome email to new user with password setup link"""
        try:
            reset_link = EmailService.get_password_reset_link(user, request)
            organization_name = user.organization.name if user.organization else "Your Organization"
            
            subject, html_content, text_content = get_welcome_email_template(
                user_name=user.name,
                organization_name=organization_name,
                reset_link=reset_link
            )
            
            # Create email with both HTML and text versions
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"Welcome email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {str(e)}")
            return False
    
    @staticmethod
    def send_password_reset_email(user, request=None):
        """Send password reset email to user"""
        try:
            reset_link = EmailService.get_password_reset_link(user, request)
            
            subject, html_content, text_content = get_password_reset_email_template(
                user_name=user.name,
                reset_link=reset_link
            )
            
            # Create email with both HTML and text versions
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[user.email]
            )
            email.attach_alternative(html_content, "text/html")
            
            # Send email
            email.send()
            
            logger.info(f"Password reset email sent successfully to {user.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send password reset email to {user.email}: {str(e)}")
            return False


def send_welcome_email_task(user_id, request_data=None):
    """
    Task function for sending welcome emails (can be used with Celery in production)
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
        return EmailService.send_welcome_email(user, request_data)
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} does not exist")
        return False


def send_password_reset_email_task(user_id, request_data=None):
    """
    Task function for sending password reset emails (can be used with Celery in production)
    """
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    try:
        user = User.objects.get(pk=user_id)
        return EmailService.send_password_reset_email(user, request_data)
    except User.DoesNotExist:
        logger.error(f"User with ID {user_id} does not exist")
        return False
