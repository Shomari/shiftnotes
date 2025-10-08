# Email Setup for Local Development

To send real emails via AWS SES in your local Docker environment:

## Step 1: Get Your AWS SES SMTP Credentials

1. Go to AWS Console → Amazon SES
2. Click **SMTP Settings** in the left sidebar
3. Click **Create SMTP Credentials**
4. Save the SMTP username and password (you won't be able to see the password again!)

## Step 2: Create `.env` File

Create a file called `.env` in the `shiftnotes-backend` directory:

```bash
cd shiftnotes-backend
cat > .env << 'EOF'
USE_REAL_EMAIL=True
EMAIL_HOST_USER=YOUR_SMTP_USERNAME_HERE
EMAIL_HOST_PASSWORD=YOUR_SMTP_PASSWORD_HERE
EOF
```

Replace `YOUR_SMTP_USERNAME_HERE` and `YOUR_SMTP_PASSWORD_HERE` with your actual credentials.

## Step 3: Update docker-compose.yml

Add this line to load the .env file at the top of docker-compose.yml:

```yaml
version: '3.8'

# Add this line:
env_file:
  - .env

services:
  ...
```

## Step 4: Restart Docker

```bash
docker-compose down
docker-compose up -d
```

## Step 5: Test Email Sending

```bash
docker-compose exec web python manage.py test_email
```

Check your email at shomari.ewing@gmail.com!

## Troubleshooting

### Check if credentials are loaded:
```bash
docker-compose exec web env | grep EMAIL
```

Should show:
- USE_REAL_EMAIL=True
- EMAIL_HOST_USER=your-username
- EMAIL_HOST_PASSWORD=your-password

### Check Django email settings:
```bash
docker-compose exec web python manage.py shell
```

Then in the shell:
```python
from django.conf import settings
print(settings.EMAIL_BACKEND)
print(settings.EMAIL_HOST_USER)
```

### View logs:
```bash
docker-compose logs web --tail 100
```

Look for lines starting with "📧 Email Backend:" to see what email backend is being used.
