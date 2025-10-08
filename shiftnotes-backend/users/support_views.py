"""
Support request views for sending support emails
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_support_request(request):
    """
    API endpoint to submit support request and send email to support
    """
    required_fields = ['subject', 'category', 'priority', 'description']
    
    # Validate required fields
    for field in required_fields:
        if not request.data.get(field):
            return Response(
                {'error': f'{field.capitalize()} is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        user = request.user
        data = request.data
        
        # Build email content
        subject = f"[EPAnotes Support] {data.get('subject')}"
        
        # HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #3b82f6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">EPAnotes Support Request</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Request Details</h2>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151;">Subject:</strong>
                            <p style="margin: 4px 0 0 0; color: #1f2937; font-size: 16px;">{data.get('subject')}</p>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151;">Category:</strong>
                            <span style="background-color: #dbeafe; color: #1e40af; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin-left: 8px;">{data.get('category').title()}</span>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151;">Priority:</strong>
                            <span style="background-color: {'#fef3c7' if data.get('priority') == 'low' else '#fed7aa' if data.get('priority') == 'medium' else '#fecaca' if data.get('priority') == 'high' else '#fca5a5'}; color: {'#92400e' if data.get('priority') == 'low' else '#9a3412' if data.get('priority') == 'medium' else '#991b1b' if data.get('priority') == 'high' else '#991b1b'}; padding: 4px 12px; border-radius: 12px; font-size: 14px; margin-left: 8px; text-transform: uppercase; font-weight: 600;">{data.get('priority')}</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">User Information</h2>
                        
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #374151;">Name:</strong>
                            <span style="color: #1f2937; margin-left: 8px;">{user.name}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #374151;">Email:</strong>
                            <span style="color: #1f2937; margin-left: 8px;">{user.email}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #374151;">Role:</strong>
                            <span style="color: #1f2937; margin-left: 8px;">{user.get_role_display()}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #374151;">Organization:</strong>
                            <span style="color: #1f2937; margin-left: 8px;">{user.organization.name if user.organization else 'N/A'}</span>
                        </div>
                        
                        <div style="margin-bottom: 8px;">
                            <strong style="color: #374151;">Program:</strong>
                            <span style="color: #1f2937; margin-left: 8px;">{user.program.name if user.program else 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Description</h2>
                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6;">{data.get('description')}</p>
                        </div>
                    </div>
                    
                    {f'''
                    <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Technical Details</h2>
                        
                        <div style="margin-bottom: 16px;">
                            <strong style="color: #374151;">Steps to Reproduce:</strong>
                            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 8px;">
                                <p style="margin: 0; color: #374151; white-space: pre-wrap;">{data.get('stepsToReproduce')}</p>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong style="color: #374151;">Expected Behavior:</strong>
                            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 8px;">
                                <p style="margin: 0; color: #374151; white-space: pre-wrap;">{data.get('expectedBehavior')}</p>
                            </div>
                        </div>
                        
                        <div style="margin-bottom: 16px;">
                            <strong style="color: #374151;">Actual Behavior:</strong>
                            <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; margin-top: 8px;">
                                <p style="margin: 0; color: #374151; white-space: pre-wrap;">{data.get('actualBehavior')}</p>
                            </div>
                        </div>
                    </div>
                    ''' if data.get('stepsToReproduce') or data.get('expectedBehavior') or data.get('actualBehavior') else ''}
                    
                    <div style="margin-top: 20px;">
                        <h2 style="color: #1f2937; margin: 0 0 12px 0; font-size: 18px;">System Information</h2>
                        <div style="background-color: #f9fafb; padding: 12px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 12px; color: #6b7280;">
                            <p style="margin: 4px 0;">Browser/Device: {data.get('browser_info', 'N/A')}</p>
                            <p style="margin: 4px 0;">Submitted: {data.get('submitted_at', 'N/A')}</p>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from EPAnotes</p>
                    <p style="margin: 4px 0 0 0;">Reply to {user.email} to respond to this request</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
EPAnotes Support Request

REQUEST DETAILS
---------------
Subject: {data.get('subject')}
Category: {data.get('category').title()}
Priority: {data.get('priority').upper()}

USER INFORMATION
----------------
Name: {user.name}
Email: {user.email}
Role: {user.get_role_display()}
Organization: {user.organization.name if user.organization else 'N/A'}
Program: {user.program.name if user.program else 'N/A'}

DESCRIPTION
-----------
{data.get('description')}

{f'''TECHNICAL DETAILS
-----------------
Steps to Reproduce:
{data.get('stepsToReproduce')}

Expected Behavior:
{data.get('expectedBehavior')}

Actual Behavior:
{data.get('actualBehavior')}
''' if data.get('stepsToReproduce') or data.get('expectedBehavior') or data.get('actualBehavior') else ''}

SYSTEM INFORMATION
------------------
Browser/Device: {data.get('browser_info', 'N/A')}
Submitted: {data.get('submitted_at', 'N/A')}

---
Reply to {user.email} to respond to this request
        """
        
        # Create and send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['support@epanotes.com'],
            reply_to=[user.email]  # Allow easy reply to user
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Support request sent from {user.email}: {data.get('subject')}")
        
        return Response({
            'message': 'Support request submitted successfully',
            'success': True,
            'reference': f'SR-{int(data.get("submitted_at", "0").replace("-", "").replace(":", "").replace("T", "").replace("Z", "")[:14]) if data.get("submitted_at") else 0}'
        })
        
    except Exception as e:
        logger.error(f"Failed to send support request from {request.user.email}: {str(e)}")
        return Response(
            {'error': 'Failed to submit support request. Please try again later.'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
