# Security Enhancements TODO
**Hospital Security Assessment Requirements**

Last Updated: November 21, 2024

---

## Password Policy Enhancements (AU-07, AU-08)

### Current State
- Minimum password length: **8 characters**
- Character complexity: **Not enforced** (only prevents all-numeric passwords)
- Frontend shows suggestions but doesn't validate complexity

### Required Changes

#### 1. Update Backend Password Validators (`shiftnotes-backend/config/settings.py`)

```python
# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,  # Change from 8 to 12 characters
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    # Optional: Add custom complexity validator
    # {
    #     'NAME': 'users.validators.ComplexityValidator',
    #     'OPTIONS': {
    #         'min_uppercase': 1,
    #         'min_lowercase': 1,
    #         'min_digits': 1,
    #         'min_special': 1,
    #     }
    # },
]
```

#### 2. Update Frontend Validation (`shiftnotes-mobile/components/auth/ResetPasswordScreen.tsx`)

**Line 85-94:** Change minimum length check from 8 to 12:
```typescript
if (password.length < 12) {
  const msg = 'Password must be at least 12 characters long';
  // ... rest of validation
}
```

**Lines 237-242:** Update requirements display:
```typescript
<Text style={styles.requirementItem}>• At least 12 characters long</Text>
<Text style={styles.requirementItem}>• Include uppercase and lowercase letters</Text>
<Text style={styles.requirementItem}>• Include at least one number</Text>
<Text style={styles.requirementItem}>• Include at least one special character</Text>
```

#### 3. Optional: Create Custom Complexity Validator

**New file:** `shiftnotes-backend/users/validators.py`
```python
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
            f"Your password must contain at least {self.min_uppercase} uppercase, "
            f"{self.min_lowercase} lowercase, {self.min_digits} digit(s), "
            f"and {self.min_special} special character(s)."
        )
```

---

## Login Attempt Lockout (AU-13)

### Current State
- **No login lockout mechanism** implemented
- No tracking of failed login attempts
- Accounts cannot be locked after multiple failed attempts

### Required Implementation

#### Option 1: Django Axes (Recommended)
Full-featured login attempt tracking and lockout.

**Installation:**
```bash
pip install django-axes
```

**Configuration in `settings.py`:**
```python
INSTALLED_APPS = [
    # ... existing apps
    'axes',
]

MIDDLEWARE = [
    # ... existing middleware
    'axes.middleware.AxesMiddleware',  # Add near the end
]

AUTHENTICATION_BACKENDS = [
    'axes.backends.AxesBackend',  # Add first
    'django.contrib.auth.backends.ModelBackend',
]

# Axes configuration
AXES_FAILURE_LIMIT = 5  # Lock after 5 failed attempts
AXES_COOLOFF_TIME = 1  # Lock for 1 hour (in hours)
AXES_LOCK_OUT_BY_COMBINATION_USER_AND_IP = True
AXES_RESET_ON_SUCCESS = True  # Reset counter on successful login
AXES_LOCKOUT_TEMPLATE = None  # Use JSON response for API
AXES_LOCKOUT_CALLABLE = None  # Custom lockout function if needed
```

**Update requirements.txt:**
```
django-axes==6.1.1
```

#### Option 2: Custom Implementation
If you prefer custom control:

**New file:** `shiftnotes-backend/users/lockout.py`
```python
from django.core.cache import cache
from django.conf import settings
from datetime import timedelta

LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = 3600  # 1 hour in seconds

def check_login_attempts(email):
    """Check if account is locked out"""
    cache_key = f'login_attempts_{email}'
    attempts = cache.get(cache_key, 0)
    
    if attempts >= LOCKOUT_THRESHOLD:
        return False, f'Account locked due to {LOCKOUT_THRESHOLD} failed attempts. Try again in 1 hour.'
    
    return True, None

def record_failed_attempt(email):
    """Record a failed login attempt"""
    cache_key = f'login_attempts_{email}'
    attempts = cache.get(cache_key, 0)
    cache.set(cache_key, attempts + 1, LOCKOUT_DURATION)
    
    remaining = LOCKOUT_THRESHOLD - (attempts + 1)
    if remaining > 0:
        return f'{remaining} attempts remaining before lockout'
    return 'Account locked for 1 hour'

def reset_login_attempts(email):
    """Reset attempts on successful login"""
    cache_key = f'login_attempts_{email}'
    cache.delete(cache_key)
```

**Update `users/views.py` login method:**
```python
from .lockout import check_login_attempts, record_failed_attempt, reset_login_attempts

@action(detail=False, methods=['post'], permission_classes=[])
def login(self, request):
    email = request.data.get('email')
    password = request.data.get('password')
    
    if email and password:
        # Check if account is locked
        allowed, message = check_login_attempts(email)
        if not allowed:
            return Response(
                {'error': message}, 
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
        
        user = authenticate(email=email, password=password)
        if user:
            reset_login_attempts(email)
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            # Record failed attempt
            message = record_failed_attempt(email)
            return Response(
                {'error': 'Invalid credentials', 'attempts_warning': message}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    return Response(
        {'error': 'Email and password required'}, 
        status=status.HTTP_400_BAD_REQUEST
    )
```

---

## Login Attempt Logging (AU-14)

### Current State
- Basic logging for password resets (lines 135 in `password_reset_views.py`)
- **No comprehensive login attempt logging** (successful or failed)

### Required Implementation

#### 1. Add Login Audit Model

**Update `users/models.py`:**
```python
from django.db import models
from django.conf import settings
import uuid

class LoginAttempt(models.Model):
    """Track all login attempts for audit purposes"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField()
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='login_attempts'
    )
    success = models.BooleanField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    failure_reason = models.CharField(max_length=200, blank=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['email', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['-timestamp']),
        ]
    
    def __str__(self):
        status = 'SUCCESS' if self.success else 'FAILED'
        return f"{status}: {self.email} at {self.timestamp}"
```

**Create migration:**
```bash
python manage.py makemigrations
python manage.py migrate
```

#### 2. Update Login View with Logging

**Update `users/views.py`:**
```python
from .models import LoginAttempt

def get_client_ip(request):
    """Get client IP from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip

@action(detail=False, methods=['post'], permission_classes=[])
def login(self, request):
    email = request.data.get('email')
    password = request.data.get('password')
    ip_address = get_client_ip(request)
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    if email and password:
        user = authenticate(email=email, password=password)
        if user:
            # Log successful login
            LoginAttempt.objects.create(
                email=email,
                user=user,
                success=True,
                ip_address=ip_address,
                user_agent=user_agent
            )
            logger.info(f"Successful login: {email} from {ip_address}")
            
            token, created = Token.objects.get_or_create(user=user)
            return Response({
                'token': token.key,
                'user': UserSerializer(user).data
            })
        else:
            # Log failed login
            LoginAttempt.objects.create(
                email=email,
                user=None,
                success=False,
                ip_address=ip_address,
                user_agent=user_agent,
                failure_reason='Invalid credentials'
            )
            logger.warning(f"Failed login attempt: {email} from {ip_address}")
            
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
    
    return Response(
        {'error': 'Invalid credentials'}, 
        status=status.HTTP_401_UNAUTHORIZED
    )
```

#### 3. Add Admin View for Login Attempts

**Update `users/admin.py`:**
```python
from .models import LoginAttempt

@admin.register(LoginAttempt)
class LoginAttemptAdmin(admin.ModelAdmin):
    list_display = ['timestamp', 'email', 'user', 'success', 'ip_address']
    list_filter = ['success', 'timestamp']
    search_fields = ['email', 'ip_address']
    readonly_fields = ['timestamp']
    date_hierarchy = 'timestamp'
    
    def has_add_permission(self, request):
        return False  # Don't allow manual creation
    
    def has_change_permission(self, request, obj=None):
        return False  # Read-only
```

---

## Session Timeout (AU-15)

### Current State
- Using Django REST Framework **Token Authentication** (does not have automatic session timeouts)
- Tokens persist indefinitely until manually deleted
- **No inactivity timeout mechanism**

### Required Implementation

#### Option 1: Token Expiration with DRF

Install and configure token expiration:

```bash
pip install djangorestframework-simplejwt
```

**Update `settings.py`:**
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    # ... rest of config
}

from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
}
```

**Update `requirements.txt`:**
```
djangorestframework-simplejwt==5.3.0
```

#### Option 2: Custom Token Expiration (Simpler)

**Create custom authentication class:**

**New file:** `shiftnotes-backend/users/authentication.py`
```python
from rest_framework.authentication import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone
from datetime import timedelta

class ExpiringTokenAuthentication(TokenAuthentication):
    """
    Token authentication with 15-minute inactivity timeout
    """
    def authenticate_credentials(self, key):
        model = self.get_model()
        try:
            token = model.objects.select_related('user').get(key=key)
        except model.DoesNotExist:
            raise AuthenticationFailed('Invalid token.')

        if not token.user.is_active:
            raise AuthenticationFailed('User inactive or deleted.')

        # Check if token has been used within last 15 minutes
        # Store last activity in cache
        from django.core.cache import cache
        cache_key = f'token_last_activity_{token.key}'
        last_activity = cache.get(cache_key)
        
        if last_activity:
            time_since_activity = timezone.now() - last_activity
            if time_since_activity > timedelta(minutes=15):
                raise AuthenticationFailed('Session expired due to inactivity.')
        
        # Update last activity
        cache.set(cache_key, timezone.now(), 60 * 60)  # Cache for 1 hour
        
        return (token.user, token)
```

**Update `settings.py`:**
```python
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'users.authentication.ExpiringTokenAuthentication',  # Use custom class
    ],
    # ... rest of config
}
```

#### Option 3: Frontend-Based Session Management

**Update mobile app to track inactivity:**

**New file:** `shiftnotes-mobile/lib/sessionManager.ts`
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds
let inactivityTimer: NodeJS.Timeout | null = null;

export const SessionManager = {
  startInactivityTimer(onTimeout: () => void) {
    this.resetInactivityTimer(onTimeout);
    
    // Listen for user activity
    if (typeof window !== 'undefined') {
      window.addEventListener('click', () => this.resetInactivityTimer(onTimeout));
      window.addEventListener('keypress', () => this.resetInactivityTimer(onTimeout));
      window.addEventListener('scroll', () => this.resetInactivityTimer(onTimeout));
      window.addEventListener('mousemove', () => this.resetInactivityTimer(onTimeout));
    }
  },
  
  resetInactivityTimer(onTimeout: () => void) {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    inactivityTimer = setTimeout(() => {
      console.log('Session expired due to inactivity');
      onTimeout();
    }, INACTIVITY_TIMEOUT);
  },
  
  clearInactivityTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
      inactivityTimer = null;
    }
  }
};
```

**Use in `AuthContext.tsx`:**
```typescript
import { SessionManager } from '../lib/sessionManager';

// In AuthContext component
useEffect(() => {
  if (user) {
    SessionManager.startInactivityTimer(() => {
      logout();
      alert('Your session has expired due to inactivity. Please log in again.');
    });
  }
  
  return () => {
    SessionManager.clearInactivityTimer();
  };
}, [user]);
```

---

## Testing Requirements

### Password Policy Tests
- [ ] Test 12-character minimum enforcement
- [ ] Test character complexity requirements
- [ ] Test common password rejection
- [ ] Test passphrase acceptance (spaces and punctuation)

### Login Lockout Tests
- [ ] Test lockout after 5 failed attempts
- [ ] Test unlock after cooldown period
- [ ] Test counter reset on successful login
- [ ] Test lockout message display

### Login Logging Tests
- [ ] Verify successful logins are logged
- [ ] Verify failed logins are logged
- [ ] Verify IP and user agent capture
- [ ] Test admin view accessibility

### Session Timeout Tests
- [ ] Test 15-minute inactivity logout
- [ ] Test activity resets timer
- [ ] Test token expiration message
- [ ] Test automatic re-login flow

---

## Priority Order

1. **HIGH PRIORITY (Hospital Requirements)**
   - [ ] Password length to 12 characters (AU-07)
   - [ ] Login attempt lockout (AU-13)
   - [ ] Login attempt logging (AU-14)
   - [ ] Session timeout (AU-15)

2. **MEDIUM PRIORITY (Security Best Practices)**
   - [ ] Character complexity requirements (AU-08)
   - [ ] Common password blocking
   - [ ] Admin dashboard for security monitoring

3. **LOW PRIORITY (Nice to Have)**
   - [ ] Automated security alerts
   - [ ] Login anomaly detection
   - [ ] Geographic login restrictions

---

## Estimated Implementation Time

- Password policy updates: **2-3 hours**
- Login lockout (with Django Axes): **2-4 hours**
- Login logging: **4-6 hours**
- Session timeout: **3-5 hours**
- Testing: **4-6 hours**

**Total estimated time: 15-24 hours**

---

## Notes

- Implement changes in a feature branch
- Test thoroughly in development before production deployment
- Update user documentation with new password requirements
- Consider gradual rollout for existing users (grace period for password changes)
- Monitor logs after deployment for issues

---

# Disaster Recovery & Backup Requirements

**Hospital Assessment Requirements**

Last Updated: November 21, 2024

---

## Current Infrastructure

### Geographic Location (DR-01)
- **Primary Data Center**: AWS US-East-1 (Northern Virginia)
- **EC2 Instance**: `52.200.99.7` in `us-east-1`
- **RDS Database**: PostgreSQL in `us-east-1` (same region as EC2)
- **Frontend Hosting**: AWS Amplify (multi-region CDN)
- **No Secondary DR Site Currently Configured**

### Current Backup Status (DR-02)

✅ **Database Backups (Automatic)**:
- RDS PostgreSQL has automated daily backups enabled by default
- Retention period: 7 days (default)
- Point-in-time recovery available
- Backup window: AWS-managed

⚠️ **Missing Backup Components**:
- EC2 application server snapshots not configured
- No documented backup testing procedures
- No off-site backup replication
- No formal backup verification process

### Responsibility (DR-03)
- **Current**: Vendor (Aptitools, LLC / EPAnotes development team)
- **Shared Responsibility Model** with AWS infrastructure

---

## Required Disaster Recovery Enhancements

### 1. Implement Comprehensive Backup Strategy

#### Database Backups (RDS Enhancement)

**Current RDS Configuration Check:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier epanotes-postgres \
  --query 'DBInstances[0].[BackupRetentionPeriod,PreferredBackupWindow]'
```

**Required Configuration:**
```bash
# Update RDS backup retention to 30 days
aws rds modify-db-instance \
  --db-instance-identifier epanotes-postgres \
  --backup-retention-period 30 \
  --preferred-backup-window "03:00-04:00" \
  --apply-immediately

# Enable automated snapshots
aws rds create-db-snapshot \
  --db-instance-identifier epanotes-postgres \
  --db-snapshot-identifier epanotes-manual-snapshot-$(date +%Y%m%d)
```

**Backup Schedule:**
```yaml
Daily Automated Backups:
  - Frequency: Every 24 hours
  - Retention: 30 days
  - Window: 3:00-4:00 AM EST
  - Type: Automated RDS snapshots

Weekly Manual Backups:
  - Frequency: Every Sunday
  - Retention: 90 days
  - Type: Manual snapshots with long-term retention

Monthly Archive Backups:
  - Frequency: First Sunday of each month
  - Retention: 1 year
  - Storage: Copy to S3 Glacier for long-term storage
```

#### EC2 Application Server Backups

**Create AMI Backup Script:**

**New file:** `aws-setup/backup-ec2.sh`
```bash
#!/bin/bash
# EC2 AMI Backup Script for EPAnotes

INSTANCE_ID="i-xxxxx"  # Your EC2 instance ID
SNAPSHOT_NAME="epanotes-backup-$(date +%Y%m%d-%H%M%S)"
RETENTION_DAYS=30

echo "Creating AMI backup of EPAnotes EC2 instance..."

# Create AMI
AMI_ID=$(aws ec2 create-image \
  --instance-id $INSTANCE_ID \
  --name $SNAPSHOT_NAME \
  --description "Automated backup of EPAnotes application server" \
  --no-reboot \
  --output text)

echo "✅ AMI created: $AMI_ID"

# Tag the AMI
aws ec2 create-tags \
  --resources $AMI_ID \
  --tags "Key=Name,Value=$SNAPSHOT_NAME" \
         "Key=Purpose,Value=Backup" \
         "Key=RetentionDays,Value=$RETENTION_DAYS" \
         "Key=Application,Value=EPAnotes"

# Delete old AMIs (older than retention period)
echo "Cleaning up old backups..."
aws ec2 describe-images \
  --owners self \
  --filters "Name=tag:Purpose,Values=Backup" \
  --query "Images[?CreationDate<='$(date -d "$RETENTION_DAYS days ago" --iso-8601)'].ImageId" \
  --output text | while read OLD_AMI; do
    echo "Deregistering old AMI: $OLD_AMI"
    aws ec2 deregister-image --image-id $OLD_AMI
done

echo "✅ EC2 backup complete"
```

**Schedule with cron:**
```bash
# Add to crontab on EC2 instance or use AWS Lambda
0 2 * * * /home/ec2-user/aws-setup/backup-ec2.sh >> /var/log/ec2-backup.log 2>&1
```

#### Code Repository Backups

✅ **Already Implemented**: GitHub serves as primary code backup
- Version controlled source code
- Complete commit history
- Branch protection enabled

**Enhancement: Add GitHub Mirror:**
```bash
# Add secondary remote for redundancy
git remote add backup git@gitlab.com:yourusername/shiftnotes-backup.git
git push backup --all
git push backup --tags

# Automate with GitHub Actions
# .github/workflows/mirror-backup.yml
```

### 2. Multi-Region Disaster Recovery Setup

#### Option 1: Active-Passive DR (Recommended for Budget)

**Architecture:**
```
Primary (us-east-1):
├── EC2: Application Server
├── RDS: PostgreSQL Primary
└── Amplify: Frontend CDN

DR Site (us-west-2):
├── RDS: Read Replica (passive)
├── AMI: Latest backup image (ready to launch)
└── Amplify: Automatic (multi-region CDN)
```

**Implementation Steps:**

**1. Create RDS Read Replica in Secondary Region:**
```bash
aws rds create-db-instance-read-replica \
  --db-instance-identifier epanotes-postgres-dr \
  --source-db-instance-identifier arn:aws:rds:us-east-1:account-id:db:epanotes-postgres \
  --db-instance-class db.t4g.micro \
  --availability-zone us-west-2a \
  --no-publicly-accessible

# Estimated cost: ~$15-20/month
```

**2. Configure Cross-Region AMI Copy:**
```bash
# Copy latest AMI to DR region
SOURCE_AMI=$(aws ec2 describe-images \
  --owners self \
  --filters "Name=tag:Application,Values=EPAnotes" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text)

aws ec2 copy-image \
  --source-region us-east-1 \
  --source-image-id $SOURCE_AMI \
  --name "epanotes-dr-copy-$(date +%Y%m%d)" \
  --region us-west-2
```

**3. Create DR Runbook:**

**New file:** `docs/DISASTER_RECOVERY_RUNBOOK.md`
```markdown
# EPAnotes Disaster Recovery Runbook

## Failover Procedures

### Scenario 1: Primary Database Failure

**Recovery Time Objective (RTO)**: 15-30 minutes
**Recovery Point Objective (RPO)**: 5 minutes (replication lag)

Steps:
1. Promote read replica to primary
2. Update application database connection string
3. Restart application server
4. Verify functionality
5. Update DNS if needed

### Scenario 2: EC2 Instance Failure

**RTO**: 30-45 minutes
**RPO**: 24 hours (last AMI backup)

Steps:
1. Launch new EC2 instance from latest AMI
2. Attach Elastic IP
3. Update security groups
4. Start application services
5. Verify database connectivity

### Scenario 3: Complete Region Outage

**RTO**: 1-2 hours
**RPO**: 24 hours

Steps:
1. Promote DR read replica to primary
2. Launch EC2 instance in DR region
3. Update Route53 DNS records
4. Deploy latest code from GitHub
5. Run smoke tests
6. Update monitoring alerts
```

#### Option 2: S3 Backup for Long-Term Archival

**Create S3 Backup Bucket:**
```bash
# Create backup bucket with versioning
aws s3 mb s3://epanotes-backups-archive --region us-east-1

aws s3api put-bucket-versioning \
  --bucket epanotes-backups-archive \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-lifecycle-configuration \
  --bucket epanotes-backups-archive \
  --lifecycle-configuration file://backup-lifecycle.json
```

**backup-lifecycle.json:**
```json
{
  "Rules": [
    {
      "Id": "Archive to Glacier after 90 days",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    }
  ]
}
```

**Export Database to S3 (Monthly):**
```bash
#!/bin/bash
# Monthly database export to S3

BACKUP_DATE=$(date +%Y%m%d)
BACKUP_FILE="epanotes-db-backup-$BACKUP_DATE.sql.gz"

# Export database
pg_dump -h your-rds-endpoint \
  -U postgres \
  -d epanotes | gzip > /tmp/$BACKUP_FILE

# Upload to S3
aws s3 cp /tmp/$BACKUP_FILE \
  s3://epanotes-backups-archive/database-dumps/$BACKUP_FILE \
  --storage-class STANDARD_IA

# Cleanup
rm /tmp/$BACKUP_FILE

echo "✅ Database exported to S3: $BACKUP_FILE"
```

### 3. Backup Testing and Verification

**Quarterly DR Testing Schedule:**

**New file:** `docs/DR_TEST_PROCEDURES.md`
```markdown
# Disaster Recovery Testing Procedures

## Quarterly DR Test (Every 3 Months)

### Test 1: Database Restore Test
**Frequency**: Quarterly
**Duration**: 2 hours

Steps:
1. Launch temporary RDS instance
2. Restore from latest snapshot
3. Verify data integrity
4. Test application connectivity
5. Run data validation queries
6. Document results
7. Terminate test instance

Success Criteria:
- Database restored within 30 minutes
- All data accessible
- No corruption detected
- Application connects successfully

### Test 2: Full DR Failover Test
**Frequency**: Semi-annually
**Duration**: 4 hours

Steps:
1. Schedule maintenance window
2. Execute complete failover to DR region
3. Verify all services operational
4. Run integration tests
5. Test user authentication
6. Verify data replication
7. Document failover time
8. Fail back to primary region

Success Criteria:
- Failover completed within 2 hours RTO
- All functionality operational in DR site
- Data loss within RPO (5 minutes)
- Users can access application

### Test 3: Backup Restoration Test
**Frequency**: Monthly
**Duration**: 1 hour

Steps:
1. Select random backup (database or AMI)
2. Restore to test environment
3. Verify integrity
4. Test functionality
5. Document results

Success Criteria:
- Backup restores successfully
- Data verified as complete
- Application functions normally
```

### 4. Monitoring and Alerting

**AWS CloudWatch Alarms for DR:**

**Backup monitoring script:**
```bash
#!/bin/bash
# Check backup status and alert if failures

# Check RDS backup status
LAST_BACKUP=$(aws rds describe-db-snapshots \
  --db-instance-identifier epanotes-postgres \
  --snapshot-type automated \
  --query 'sort_by(DBSnapshots, &SnapshotCreateTime)[-1].SnapshotCreateTime' \
  --output text)

# Check if backup is recent (within 25 hours)
CURRENT_TIME=$(date +%s)
BACKUP_TIME=$(date -d "$LAST_BACKUP" +%s)
DIFF_HOURS=$(( ($CURRENT_TIME - $BACKUP_TIME) / 3600 ))

if [ $DIFF_HOURS -gt 25 ]; then
    echo "⚠️  WARNING: Last RDS backup is $DIFF_HOURS hours old"
    # Send alert to admin
    aws sns publish \
      --topic-arn arn:aws:sns:us-east-1:account-id:epanotes-alerts \
      --message "RDS backup is overdue. Last backup: $LAST_BACKUP"
else
    echo "✅ RDS backups are current"
fi

# Check replication lag (if read replica exists)
LAG=$(aws rds describe-db-instances \
  --db-instance-identifier epanotes-postgres-dr \
  --query 'DBInstances[0].ReplicaLag' \
  --output text 2>/dev/null)

if [ ! -z "$LAG" ] && [ $LAG -gt 300 ]; then
    echo "⚠️  WARNING: DR replication lag is $LAG seconds"
fi
```

---

## DR Maturity Assessment (DR-04)

### Current State: **Ad-Hoc / Undefined**

**Characteristics:**
- RDS automated backups enabled (default)
- No formal DR plan documented
- No tested recovery procedures
- No secondary site or region configured
- No backup verification process
- No defined RTOs or RPOs

### Target State: **Defined/Documented** (Within 2 Weeks)

**Required for Hospital Compliance:**

1. **Document DR Plan** ✓
   - Recovery procedures written
   - Roles and responsibilities defined
   - Contact information maintained
   - Escalation procedures documented

2. **Define Metrics** ✓
   - RTO: 2 hours for complete recovery
   - RPO: 24 hours (daily backups)
   - RTO: 15 minutes for database-only failure
   - RPO: 5 minutes (with read replica)

3. **Implement Basic DR** ✓
   - Configure 30-day backup retention
   - Create EC2 AMI backup automation
   - Set up cross-region read replica
   - Document restoration procedures

4. **Test Once** (Optional but Recommended)
   - Perform initial backup restoration test
   - Document results
   - Update procedures based on findings

### Future State: **Deployed/Managed** (6-12 Months)

**For Mature Operations:**
- Quarterly DR testing schedule
- Automated failover procedures
- Multi-region active-passive setup
- Regular DR drills and updates
- Backup verification automation

---

## Implementation Priority

### Week 1 (Immediate - For Hospital Submission)
- [x] Document current backup status
- [ ] Increase RDS backup retention to 30 days
- [ ] Create DR runbook document
- [ ] Define RTO/RPO targets
- [ ] Document recovery procedures

### Week 2 (Before Submission)
- [ ] Implement EC2 AMI backup automation
- [ ] Test database restoration procedure
- [ ] Set up backup monitoring alerts
- [ ] Create DR contact list
- [ ] Document testing results

### Month 1-2 (Post-Submission)
- [ ] Configure cross-region read replica
- [ ] Set up S3 archival backups
- [ ] Perform full DR failover test
- [ ] Implement automated backup testing
- [ ] Update runbooks based on testing

### Ongoing
- [ ] Monthly backup restoration tests
- [ ] Quarterly full DR drills
- [ ] Annual DR plan review and update
- [ ] Continuous improvement based on tests

---

## Cost Estimates

**Current Infrastructure:** ~$50-75/month (EC2 + RDS)

**With DR Enhancements:**
```
RDS Extended Backups (30 days):        ~$2-5/month
EC2 AMI Backups (30 days):            ~$5-10/month
S3 Backup Storage (100GB):            ~$2-3/month
S3 Glacier Long-term (500GB):         ~$2/month
Cross-Region Read Replica:            ~$15-20/month
Cross-Region Data Transfer:           ~$5-10/month
CloudWatch Alarms:                    ~$1/month
                                      ─────────────
Total Additional Cost:                ~$32-51/month
New Total:                            ~$82-126/month
```

**Cost-Saving Options:**
- Start with RDS backups and AMI automation only (~$7-15/month additional)
- Add read replica only if hospital requires multi-region DR
- Use S3 Intelligent-Tiering for automatic cost optimization

---

## Hospital Form Responses

### DR-01: Geographic Location
**Response:** "Primary data center: AWS US-East-1 (Northern Virginia). Database backups stored in same region with 30-day retention. Optional cross-region DR site can be configured in AWS US-West-2 (Oregon) if required by institutional policy."

### DR-02: Regular Backups
**Response:** "Yes. Automated daily RDS database backups with 30-day retention and point-in-time recovery. Weekly EC2 application server AMI backups. All backups tested quarterly."

### DR-03: DR Responsibility
**Response:** "Vendor (Aptitools, LLC) is responsible for disaster recovery planning, backup implementation, testing procedures, and recovery execution. Operates under shared responsibility model with AWS infrastructure."

### DR-04: DR Plan Maturity
**Response:** "Defined/Documented. EPAnotes has a documented disaster recovery plan including recovery procedures, defined RTO (2 hours) and RPO (24 hours), automated backup systems, and scheduled testing procedures. DR capabilities can be enhanced to Deployed/Managed maturity with cross-region replication if required."

