"""
Custom password validators for hospital security compliance.
Implements AU-08 character complexity requirements.
"""
from django.core.exceptions import ValidationError
from django.utils.translation import gettext as _
import re


class ComplexityValidator:
    """
    Validate password complexity requirements:
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    
    These requirements align with hospital security standards (AU-08).
    """
    
    def __init__(self, min_uppercase=1, min_lowercase=1, min_digits=1, min_special=1):
        self.min_uppercase = min_uppercase
        self.min_lowercase = min_lowercase
        self.min_digits = min_digits
        self.min_special = min_special

    def validate(self, password, user=None):
        errors = []
        
        if len(re.findall(r'[A-Z]', password)) < self.min_uppercase:
            errors.append(
                f'Password must contain at least {self.min_uppercase} uppercase letter(s).'
            )
        
        if len(re.findall(r'[a-z]', password)) < self.min_lowercase:
            errors.append(
                f'Password must contain at least {self.min_lowercase} lowercase letter(s).'
            )
        
        if len(re.findall(r'\d', password)) < self.min_digits:
            errors.append(
                f'Password must contain at least {self.min_digits} digit(s).'
            )
        
        if len(re.findall(r'[^A-Za-z0-9]', password)) < self.min_special:
            errors.append(
                f'Password must contain at least {self.min_special} special character(s).'
            )
        
        if errors:
            raise ValidationError(errors)

    def get_help_text(self):
        return _(
            f"Your password must contain at least {self.min_uppercase} uppercase letter(s), "
            f"{self.min_lowercase} lowercase letter(s), {self.min_digits} digit(s), "
            f"and {self.min_special} special character(s)."
        )

