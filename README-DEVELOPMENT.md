# EPAnotes Development Workflow

## 🧪 Testing Before Push

**ALWAYS run the build test before pushing to GitHub:**

```bash
./test-build.sh
```

This script will:
1. Install dependencies
2. Check for syntax errors
3. Test the Expo web build
4. Confirm it's safe to push

## 🚀 Deployment Process

1. **Test locally first**: `./test-build.sh`
2. **Commit changes**: `git add . && git commit -m "your message"`
3. **Push to GitHub**: `git push origin main`
4. **Monitor AWS Amplify**: Check the deployment status in the AWS console

## 🐛 Common Issues

### Build Failures
- **JSX Syntax Errors**: Missing closing tags, unmatched parentheses
- **TypeScript Errors**: Type mismatches, missing exports
- **Import Errors**: Incorrect paths, missing dependencies

### Quick Fixes
- **JSX**: Check for proper opening/closing of fragments `<>` and `</>`
- **Ternary Operators**: Ensure `condition ? (true) : (false)` structure
- **Exports**: Make sure all imported components are properly exported

## 📁 Key Files

- `test-build.sh` - Local build testing script
- `shiftnotes-mobile/` - Frontend React Native/Expo app
- `shiftnotes-backend/` - Django REST API
- `deploy-with-cleanup.sh` - Backend deployment script

## 🔧 Development Tips

1. **Always test locally** before pushing
2. **Fix syntax errors first**, then type errors
3. **Use the build script** to catch issues early
4. **Monitor AWS Amplify** for deployment status
5. **Keep commits focused** and descriptive

## 🎯 Current Status

- ✅ User Management with deactivation
- ✅ Full page navigation
- ✅ Local build testing
- ⚠️ TypeScript errors need cleanup (non-blocking)
- ✅ Production deployment working
