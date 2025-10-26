# Android Play Store Submission Guide

## Configuration Complete ✅

The following has been configured and is ready:

### App Configuration
- **Package Name:** `com.aptitools.epanotes`
- **Version:** 1.0.0 (Version Code: 1)
- **Permissions:** INTERNET, ACCESS_NETWORK_STATE
- **Build Type:** AAB (Android App Bundle)

### Files Created
- ✅ `shiftnotes-mobile/app.json` - Android configuration
- ✅ `shiftnotes-mobile/eas.json` - Build and submission config
- ✅ `shiftnotes-mobile/assets/playstore-icon-512.png` - 512x512 app icon
- ✅ `shiftnotes-mobile/assets/feature-graphic-1024x500.png` - Feature graphic
- ✅ 4 Android phone screenshots (1080x1920) in `/Users/shomariewing/Downloads/`

---

## Next Steps (Manual Actions Required)

### STEP 1: Create Google Play Console Account

1. Go to: https://play.google.com/console/signup
2. Sign in with Google account (sewing@epanotes.com or company account)
3. Pay **$25 one-time registration fee**
4. Complete developer profile:
   - Developer name: **Aptitools, LLC**
   - Email: **support@epanotes.com**
   - Website: **https://epanotes.com**
   - Privacy policy: **https://epanotes.com/privacy**

⏱️ **Account review:** Can take up to 48 hours

---

### STEP 2: Generate Android Signing Keys

Run this command in the terminal:

```bash
cd /Users/shomariewing/Workspace/shiftnotes/shiftnotes-mobile
eas credentials
```

Then:
1. Select: **Android**
2. Select: **production**
3. Select: **Set up new keystore**
4. EAS will generate and securely store the keystore

---

### STEP 3: Build Android App Bundle

Run this command:

```bash
cd /Users/shomariewing/Workspace/shiftnotes/shiftnotes-mobile
eas build --platform android --profile production
```

⏱️ **Build time:** ~15-20 minutes

The command will output a download link for the AAB file when complete.

---

### STEP 4: Create App in Play Console

Once your developer account is approved:

1. Go to Play Console
2. Click **"Create app"**
3. Fill in:
   - **App name:** EPAnotes
   - **Default language:** English (United States)
   - **App or game:** App
   - **Free or paid:** Free
4. Accept declarations and create app

---

### STEP 5: Complete Store Listing

#### Main Store Listing

**Short description** (80 characters max):
```
Competency tracking made easy for medical training programs
```

**Full description** (4000 characters max):
```
EPAnotes streamlines competency-based medical education by making trainee assessments fast, transparent, and actionable. Designed for residency and fellowship programs, EPAnotes enables faculty to document EPA (Entrustable Professional Activity) evaluations in under 2 minutes while providing trainees with meaningful feedback and clear progress tracking.

For Faculty:
• Complete post-shift assessments quickly with intuitive EPA selection
• Rate entrustment levels with standardized scales
• Provide structured feedback that drives improvement
• Track evaluations across multiple trainees

For Trainees:
• View real-time assessment feedback
• Monitor EPA progress and competency milestones
• Export performance data for portfolio reviews
• Access actionable insights for growth

For Program Leadership:
• Analyze program-wide performance trends
• Generate compliance reports effortlessly
• Make data-driven curriculum decisions
• Ensure accreditation requirements are met

Key Features:
✓ Secure, HIPAA-compliant platform
✓ Role-based access for faculty, trainees, and administrators
✓ Mobile-first design for on-the-go documentation
✓ Comprehensive analytics and reporting
✓ Seamless integration with training workflows

EPAnotes transforms competency tracking from a burden into a powerful tool for educational excellence. Join leading training programs in making assessment documentation efficient and feedback meaningful.
```

**App icon:**
- Upload: `shiftnotes-mobile/assets/playstore-icon-512.png` (512x512)

**Feature graphic:**
- Upload: `shiftnotes-mobile/assets/feature-graphic-1024x500.png` (1024x500)
- Note: You may want to enhance this with text/branding in a design tool

**Screenshots** (Phone - minimum 2 required):
Upload from `/Users/shomariewing/Downloads/`:
- `Android_Phone_Screenshot_2048x2732.png`
- `Android_Phone_Screenshot_2_2048x2732.png`
- `Android_Phone_Screenshot_3_2048x2732.png`
- `Android_Phone_Screenshot_4_2048x2732.png`

**Categorization:**
- **Category:** Medical
- **Tags:** medical education, competency tracking, epa assessment, residency training

---

### STEP 6: Complete App Content

#### Privacy Policy
- **URL:** https://epanotes.com/privacy

#### Data Safety
Complete the questionnaire:

**Data Collection:**
- ✅ **Contact Info:** Name, Email Address
  - Purpose: App functionality
  - Linked to user: Yes
  - Used for tracking: No

- ✅ **User Content:** Other user content (assessments, feedback)
  - Purpose: App functionality
  - Linked to user: Yes
  - Used for tracking: No

- ✅ **App Activity:** Crash logs, Diagnostics
  - Purpose: App functionality, Analytics
  - Linked to user: Yes
  - Used for tracking: No

**Data Sharing:**
- No data shared with third parties

**Data Security:**
- Data encrypted in transit: Yes
- Data encrypted at rest: Yes
- Users can request data deletion: Yes

#### Content Rating (IARC Questionnaire)
- **Category:** Education
- **Target age:** 18+
- **Violence:** None
- **Sexual content:** None
- **Language:** None
- **Controlled substances:** None
- **Gambling:** None
- **App interactivity:** Users can interact

#### Target Audience
- **Age range:** 18+
- **Content:** Medical education

#### App Access
- **All functionality available without restrictions**

#### Ads
- **Contains ads:** No

---

### STEP 7: Upload AAB and Submit

1. Go to **"Release" → "Production"**
2. Click **"Create new release"**
3. Upload the AAB file from EAS build
4. **Release notes:**
```
Initial release of EPAnotes - Competency Tracking System

Features:
• Post-shift EPA assessments for medical trainees
• Real-time feedback and progress tracking
• Comprehensive analytics dashboard
• Role-based access for faculty, trainees, and administrators
• Secure, HIPAA-compliant platform
• Mobile-optimized interface
```

5. Choose rollout:
   - **Staged rollout:** Start with 10-50% of users
   - **Full rollout:** 100% (recommended for initial release)

6. Click **"Review release"**
7. Click **"Start rollout to Production"**

⏱️ **Review time:** Typically 3-7 days (can be longer for new accounts)

---

## Post-Submission

### After Approval
- Monitor **Play Console Dashboard** for:
  - Install statistics
  - Crash reports
  - User reviews and ratings
  - Performance metrics

### Responding to Reviews
- Enable notifications for new reviews
- Respond to user feedback promptly
- Address issues reported in reviews

### Future Updates
When ready to release updates:

```bash
# Build new version (version code auto-increments)
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android --profile production
```

⏱️ **Update review:** Typically 1-2 days

---

## Troubleshooting

### Build Fails
- Check EAS build logs
- Verify `app.json` and `eas.json` are valid JSON
- Ensure signing keys are configured

### Submission Rejected
Common reasons:
- Incomplete store listing
- Missing privacy policy
- Data safety questionnaire not completed
- Content rating not filled
- APK instead of AAB uploaded

### Can't Find AAB File
- Check EAS build output for download link
- Download from: https://expo.dev/accounts/xeroshogun/projects/epanotes/builds

---

## Contact Information

**Developer:** Aptitools, LLC
**Support Email:** support@epanotes.com
**Website:** https://epanotes.com
**Privacy Policy:** https://epanotes.com/privacy

---

## Quick Reference

| Item | Value |
|------|-------|
| Package Name | com.aptitools.epanotes |
| Version | 1.0.0 |
| Version Code | 1 |
| Category | Medical |
| Price | Free |
| Privacy Policy | https://epanotes.com/privacy |
| Support Email | support@epanotes.com |

---

## Checklist

- [ ] Create Google Play Console account ($25)
- [ ] Developer account approved (48 hours)
- [ ] Generate Android signing keys (`eas credentials`)
- [ ] Build AAB (`eas build --platform android --profile production`)
- [ ] Create app in Play Console
- [ ] Complete main store listing
- [ ] Upload app icon (512x512)
- [ ] Upload feature graphic (1024x500)
- [ ] Upload 4 phone screenshots
- [ ] Add privacy policy URL
- [ ] Complete data safety questionnaire
- [ ] Complete content rating questionnaire
- [ ] Upload AAB file
- [ ] Add release notes
- [ ] Submit for review
- [ ] Monitor Play Console for approval

---

**Good luck with your Android submission!** 🚀

