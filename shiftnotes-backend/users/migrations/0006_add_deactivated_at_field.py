# Generated migration for adding deactivated_at field to User model

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_change_programs_to_single_program'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='deactivated_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='When this user was deactivated. If null, user is active.'
            ),
        ),
    ]
