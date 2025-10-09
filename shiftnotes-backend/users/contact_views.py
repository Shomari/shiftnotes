"""
Contact form views for landing page
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.core.mail import EmailMultiAlternatives
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])  # Public endpoint for landing page
def submit_contact_form(request):
    """
    API endpoint to submit contact form from landing page
    Sends email to info@epanotes.com
    """
    required_fields = ['name', 'email', 'institution', 'role', 'inquiryType']
    
    # Validate required fields
    for field in required_fields:
        if not request.data.get(field):
            return Response(
                {'error': f'{field.capitalize()} is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
    
    try:
        data = request.data
        
        # Build email content
        subject = f"[EPAnotes Contact] {data.get('inquiryType').replace('-', ' ').title()} - {data.get('institution')}"
        
        # Map inquiry type to friendly name
        inquiry_type_map = {
            'demo': 'Request Demo',
            'pricing': 'Pricing Information',
            'implementation': 'Implementation Consultation',
            'support': 'Technical Support',
            'partnership': 'Partnership Opportunity',
            'other': 'Other Inquiry'
        }
        inquiry_type_display = inquiry_type_map.get(data.get('inquiryType'), data.get('inquiryType'))
        
        # Map role to friendly name
        role_map = {
            'program-director': 'Program Director',
            'associate-director': 'Associate Program Director',
            'coordinator': 'Residency Coordinator',
            'faculty': 'Faculty Member',
            'department-head': 'Department Head',
            'administrator': 'Administrator',
            'other': 'Other'
        }
        role_display = role_map.get(data.get('role'), data.get('role'))
        
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
                <div style="background-color: #1F466F; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">New Contact Form Submission</h1>
                    <p style="color: #e0f2fe; margin: 8px 0 0 0; font-size: 14px;">EPAnotes Landing Page</p>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Inquiry Type</h2>
                        <div style="background-color: #dbeafe; color: #1e40af; padding: 8px 16px; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
                            {inquiry_type_display}
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #f3f4f6;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Contact Information</h2>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Name:</strong>
                            <span style="color: #1f2937; font-size: 16px;">{data.get('name')}</span>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Email:</strong>
                            <a href="mailto:{data.get('email')}" style="color: #3b82f6; font-size: 16px; text-decoration: none;">{data.get('email')}</a>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Institution:</strong>
                            <span style="color: #1f2937; font-size: 16px;">{data.get('institution')}</span>
                        </div>
                        
                        <div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Role:</strong>
                            <span style="color: #1f2937; font-size: 16px;">{role_display}</span>
                        </div>
                        
                        {f'''<div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Program Size:</strong>
                            <span style="color: #1f2937; font-size: 16px;">{data.get('programSize')}</span>
                        </div>''' if data.get('programSize') else ''}
                        
                        {f'''<div style="margin-bottom: 12px;">
                            <strong style="color: #374151; display: block; margin-bottom: 4px;">Implementation Timeline:</strong>
                            <span style="color: #1f2937; font-size: 16px;">{data.get('timeline')}</span>
                        </div>''' if data.get('timeline') else ''}
                    </div>
                    
                    {f'''<div style="margin-bottom: 24px;">
                        <h2 style="color: #1f2937; margin: 0 0 16px 0; font-size: 18px;">Message</h2>
                        <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; border: 1px solid #e5e7eb;">
                            <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.6;">{data.get('message')}</p>
                        </div>
                    </div>''' if data.get('message') else ''}
                    
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #1e40af; font-weight: 600; font-size: 14px;">
                            💡 Quick Action: Reply directly to this email to respond to {data.get('name')}
                        </p>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">EPAnotes Contact Form</p>
                    <p style="margin: 4px 0 0 0;">Submitted from https://epanotes.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Plain text version
        text_content = f"""
EPAnotes Contact Form Submission
=================================

INQUIRY TYPE: {inquiry_type_display}

CONTACT INFORMATION
-------------------
Name: {data.get('name')}
Email: {data.get('email')}
Institution: {data.get('institution')}
Role: {role_display}
{f"Program Size: {data.get('programSize')}" if data.get('programSize') else ''}
{f"Timeline: {data.get('timeline')}" if data.get('timeline') else ''}

{f'''MESSAGE
-------
{data.get('message')}
''' if data.get('message') else ''}

---
Reply to {data.get('email')} to respond to this inquiry.
Submitted from: https://epanotes.com
        """
        
        # Create and send email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=['info@epanotes.com'],
            reply_to=[data.get('email')]  # Allow easy reply to inquirer
        )
        email.attach_alternative(html_content, "text/html")
        email.send()
        
        logger.info(f"Contact form submission sent from {data.get('email')} ({data.get('name')})")
        
        return Response({
            'message': 'Contact form submitted successfully',
            'success': True
        })
        
    except Exception as e:
        logger.error(f"Failed to send contact form email: {str(e)}")
        return Response(
            {'error': 'Failed to submit contact form. Please try emailing us directly at info@epanotes.com'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

