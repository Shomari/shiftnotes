"""
Email templates for user management functionality
"""

def get_welcome_email_template(user_name, organization_name, reset_link):
    """Welcome email template for new users"""
    
    subject = "Welcome to EPAnotes - Set Your Password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to EPAnotes</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }}
            .container {{
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                width: 60px;
                height: 60px;
                background-color: #3b82f6;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                font-size: 24px;
            }}
            h1 {{
                color: #1e293b;
                margin-bottom: 8px;
                font-size: 24px;
            }}
            .subtitle {{
                color: #64748b;
                margin-bottom: 30px;
            }}
            .button {{
                display: inline-block;
                background-color: #3b82f6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
            }}
            .button:hover {{
                background-color: #2563eb;
            }}
            .info-box {{
                background-color: #f0f9ff;
                border: 1px solid #bae6fd;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">📋</div>
                <h1>Welcome to EPAnotes</h1>
                <p class="subtitle">Your competency tracking platform</p>
            </div>
            
            <p>Hello {user_name},</p>
            
            <p>Welcome to EPAnotes! Your account has been created for <strong>{organization_name}</strong>. EPAnotes is your comprehensive platform for tracking EPA (Entrustable Professional Activities) assessments and competency development.</p>
            
            <p>To get started, you'll need to set up your password by clicking the button below:</p>
            
            <div style="text-align: center;">
                <a href="{reset_link}" class="button">Set Your Password</a>
            </div>
            
            <div class="info-box">
                <strong>What you can do with EPAnotes:</strong>
                <ul>
                    <li>Complete and review EPA assessments</li>
                    <li>Track competency progression over time</li>
                    <li>View detailed analytics and insights</li>
                    <li>Generate reports for accreditation</li>
                </ul>
            </div>
            
            <p>If you have any questions or need assistance, please don't hesitate to reach out to your program administrator or our support team.</p>
            
            <p>Best regards,<br>
            The EPAnotes Team<br>
            <em>Powered by AptiTools</em></p>
            
            <div class="footer">
                <p><strong>Security Note:</strong> This password reset link will expire in 24 hours for your security.</p>
                <p>If you didn't expect this email, please contact your administrator immediately.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Welcome to EPAnotes!
    
    Hello {user_name},
    
    Welcome to EPAnotes! Your account has been created for {organization_name}. 
    EPAnotes is your comprehensive platform for tracking EPA assessments and competency development.
    
    To get started, please set up your password by visiting:
    {reset_link}
    
    What you can do with EPAnotes:
    - Complete and review EPA assessments
    - Track competency progression over time
    - View detailed analytics and insights
    - Generate reports for accreditation
    
    If you have any questions, please contact your program administrator.
    
    Best regards,
    The EPAnotes Team
    Powered by AptiTools
    
    Security Note: This password reset link will expire in 24 hours for your security.
    """
    
    return subject, html_content, text_content


def get_password_reset_email_template(user_name, reset_link):
    """Password reset email template"""
    
    subject = "Reset Your EPAnotes Password"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f8fafc;
            }}
            .container {{
                background-color: white;
                border-radius: 8px;
                padding: 40px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }}
            .header {{
                text-align: center;
                margin-bottom: 30px;
            }}
            .logo {{
                width: 60px;
                height: 60px;
                background-color: #3b82f6;
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 16px;
                font-size: 24px;
            }}
            h1 {{
                color: #1e293b;
                margin-bottom: 8px;
                font-size: 24px;
            }}
            .button {{
                display: inline-block;
                background-color: #3b82f6;
                color: white;
                padding: 12px 24px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: 500;
                margin: 20px 0;
            }}
            .security-warning {{
                background-color: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 6px;
                padding: 16px;
                margin: 20px 0;
                color: #92400e;
            }}
            .footer {{
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
                color: #64748b;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo">🔐</div>
                <h1>Reset Your Password</h1>
            </div>
            
            <p>Hello {user_name},</p>
            
            <p>We received a request to reset your EPAnotes password. If you made this request, click the button below to set a new password:</p>
            
            <div style="text-align: center;">
                <a href="{reset_link}" class="button">Reset Password</a>
            </div>
            
            <div class="security-warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <p>For your security, this link will expire in 24 hours.</p>
            
            <p>Best regards,<br>
            The EPAnotes Team</p>
            
            <div class="footer">
                <p>If you're having trouble clicking the button, copy and paste this link into your browser:</p>
                <p style="word-break: break-all;">{reset_link}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    text_content = f"""
    Reset Your EPAnotes Password
    
    Hello {user_name},
    
    We received a request to reset your EPAnotes password. If you made this request, 
    please visit the following link to set a new password:
    
    {reset_link}
    
    Security Notice: If you didn't request this password reset, please ignore this email. 
    Your password will remain unchanged.
    
    For your security, this link will expire in 24 hours.
    
    Best regards,
    The EPAnotes Team
    """
    
    return subject, html_content, text_content
