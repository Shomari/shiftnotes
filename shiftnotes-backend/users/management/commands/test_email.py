"""
Management command to send a test email
Usage: python manage.py test_email
"""

from django.core.management.base import BaseCommand
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


class Command(BaseCommand):
    help = 'Send a test email to verify SES configuration'

    def handle(self, *args, **options):
        to_email = 'shomari.ewing@gmail.com'
        
        subject = '[EPAnotes] Test Email - SES Configuration'
        
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: #3b82f6; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px;">✅ Email Test Successful!</h1>
                </div>
                
                <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1f2937; margin-top: 0;">EPAnotes Email Configuration Working</h2>
                    
                    <p style="color: #374151; line-height: 1.6;">
                        This is a test email to confirm that your EPAnotes email configuration is working correctly through Amazon SES.
                    </p>
                    
                    <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
                        <p style="margin: 0; color: #1e40af; font-weight: 600;">Configuration Details:</p>
                        <ul style="color: #1e3a8a; margin: 8px 0;">
                            <li>From: {settings.DEFAULT_FROM_EMAIL}</li>
                            <li>To: {to_email}</li>
                            <li>Service: Amazon SES</li>
                            <li>Status: ✅ Working</li>
                        </ul>
                    </div>
                    
                    <p style="color: #374151; line-height: 1.6;">
                        Your emails for password resets, welcome messages, and support requests will now be sent from <strong>support@epanotes.com</strong>.
                    </p>
                    
                    <p style="color: #374151; line-height: 1.6; margin-bottom: 0;">
                        Best regards,<br>
                        <strong>The EPAnotes Team</strong>
                    </p>
                </div>
                
                <div style="margin-top: 20px; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">EPAnotes - Competency Tracking System</p>
                    <p style="margin: 4px 0 0 0;">https://app.epanotes.com</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        text_content = f"""
EPAnotes Email Test
===================

This is a test email to confirm that your EPAnotes email configuration is working correctly through Amazon SES.

Configuration Details:
- From: {settings.DEFAULT_FROM_EMAIL}
- To: {to_email}
- Service: Amazon SES
- Status: ✅ Working

Your emails for password resets, welcome messages, and support requests will now be sent from support@epanotes.com.

Best regards,
The EPAnotes Team

---
EPAnotes - Competency Tracking System
https://app.epanotes.com
        """
        
        try:
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=settings.DEFAULT_FROM_EMAIL,
                to=[to_email]
            )
            email.attach_alternative(html_content, "text/html")
            email.send()
            
            self.stdout.write(self.style.SUCCESS(f'✅ Test email sent successfully to {to_email}'))
            self.stdout.write(self.style.SUCCESS(f'   From: {settings.DEFAULT_FROM_EMAIL}'))
            self.stdout.write(self.style.SUCCESS(f'   Check your inbox at {to_email}'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Failed to send test email: {str(e)}'))
            self.stdout.write(self.style.WARNING('   Check your AWS SES configuration'))
