# 🚀 AWS Amplify Deployment Guide for EPAnotes

## **Step 1: Access AWS Amplify Console**

1. **Go to AWS Console**: https://console.aws.amazon.com/amplify/
2. **Sign in** with your AWS credentials
3. **Click "Get Started"** under "Amplify Hosting"

---

## **Step 2: Connect Your Repository**

1. **Select "GitHub"** as your repository service
2. **Authorize AWS Amplify** to access your GitHub account
3. **Select your repository**: `shiftnotes` (or whatever you named it)
4. **Select branch**: `main` (or your default branch)
5. **Click "Next"**

---

## **Step 3: Configure Build Settings**

### **App Settings:**
- **App name**: `EPAnotes` 
- **Environment name**: `production`

### **Build Settings:**
Amplify should auto-detect the `amplify.yml` file we created. If not, use these settings:

```yaml
version: 1
applications:
  - frontend:
      phases:
        preBuild:
          commands:
            - npm ci
            - echo "Setting up environment for production..."
        build:
          commands:
            - echo "Building Expo web app for production..."
            - npm run web:build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
    appRoot: shiftnotes-mobile
```

**Important**: Set **App root directory** to `shiftnotes-mobile`

---

## **Step 4: Environment Variables**

Click **"Advanced settings"** and add these environment variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `EXPO_PUBLIC_ENV` | `production` |

*Note: Our app will automatically use the production API endpoint*

---

## **Step 5: Review and Deploy**

1. **Review all settings**
2. **Click "Save and deploy"**
3. **Wait for deployment** (usually 3-5 minutes)

---

## **Step 6: Deployment Process**

You'll see these phases:
1. **Provision** ⏳ - Setting up infrastructure
2. **Build** 🔨 - Running `npm ci` and `expo export`
3. **Deploy** 🚀 - Uploading to CloudFront CDN
4. **Verify** ✅ - Final checks

---

## **Step 7: Access Your App**

Once deployed, you'll get:
- **Amplify URL**: `https://main.xxxxx.amplifyapp.com`
- **Custom domain** (if configured): `your-domain.com`

---

## **🔧 Troubleshooting**

### **Common Issues:**

#### **Build Fails - "expo: command not found"**
**Solution**: Update `amplify.yml`:
```yaml
preBuild:
  commands:
    - npm ci
    - npx expo install --fix
```

#### **Build Fails - "Cannot find module"**
**Solution**: Clear cache and rebuild:
1. Go to App Settings → General
2. Click "Clear cache and rebuild"

#### **App Shows Blank Page**
**Solution**: Check browser console for errors:
1. Press F12 in browser
2. Look for API connection errors
3. Verify environment variables are set correctly

#### **API Connection Fails**
**Solution**: Our app should automatically use the production API endpoint. Check:
1. Environment variables are set to `production`
2. Backend at `http://44.197.181.141:8001/api` is running
3. CORS settings allow the Amplify domain

---

## **🎯 Post-Deployment Checklist**

### **Test Core Functionality:**
- [ ] **Login page loads**
- [ ] **Demo logins work**
- [ ] **API calls succeed**
- [ ] **Navigation works**
- [ ] **Responsive design**

### **Demo Accounts to Test:**
- **Admin**: `admin@johns-hopkins.com` / `demo`
- **Faculty**: `faculty@johns-hopkins.com` / `demo`
- **Trainee**: `trainee@johns-hopkins.com` / `demo`
- **Leadership**: `leadership@johns-hopkins.com` / `demo`

---

## **🔒 Security Configuration**

### **Custom Headers** (Optional but Recommended)
In Amplify Console → App Settings → Rewrites and redirects:

```
Source: /<*>
Target: /index.html
Type: 200 (Rewrite)
```

Add **Custom Headers**:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
```

---

## **🌐 Custom Domain Setup** (Optional)

1. **Go to App Settings → Domain management**
2. **Click "Add domain"**
3. **Enter your domain** (e.g., `epanotes.com`)
4. **Configure DNS** (Amplify will provide instructions)
5. **Wait for SSL certificate** (automatic)

---

## **📊 Monitoring & Analytics**

### **Built-in Amplify Monitoring:**
- **Performance metrics**
- **Error tracking**
- **User analytics**
- **Build history**

### **Access Logs:**
- Go to **App Settings → Monitoring**
- View **CloudWatch logs**
- Check **Build logs** for troubleshooting

---

## **🔄 Continuous Deployment**

**Automatic deployments** are now set up!
- Push to `main` branch → Auto-deployment
- Pull request → Preview deployment
- Branch deployments available for staging

---

## **💰 Cost Estimation**

**Expected Monthly Costs:**
- **Build minutes**: ~$0.01/minute (first 1000 free)
- **Data storage**: ~$0.023/GB (first 5GB free)
- **Data transfer**: ~$0.15/GB (first 15GB free)

**Estimated total**: $1-5/month for small to medium traffic

---

## **🎉 Success!**

Your EPAnotes app is now:
- ✅ **Live on AWS Amplify**
- ✅ **HIPAA-ready infrastructure**
- ✅ **Auto-deploying** from GitHub
- ✅ **Production environment** configured
- ✅ **Ready for custom domain**

**Next steps:**
1. Test all functionality
2. Share the URL with users
3. Configure custom domain
4. Set up AWS BAA for HIPAA compliance
