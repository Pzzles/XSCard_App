# 🔥 Firebase Configuration Setup

## Overview
You need to configure Firebase client SDK to match your existing Firebase project (the same one your backend uses).

## Step 1: Get Firebase Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your existing project (the same one your backend uses)
3. Click on the gear icon ⚙️ → Project Settings
4. Scroll down to "Your apps" section
5. If you don't have a web app registered:
   - Click "Add app" → Web (</>) icon
   - Give it a name like "XSCard Web App"
   - Click "Register app"
6. Copy the configuration object that looks like this:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
};
```

## Step 2: Update Configuration File

Open `src/config/firebaseConfig.ts` and replace the placeholder values:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",           // Replace this
  authDomain: "YOUR_ACTUAL_PROJECT.firebaseapp.com",  // Replace this
  projectId: "YOUR_ACTUAL_PROJECT_ID",     // Replace this - MUST match backend
  storageBucket: "YOUR_ACTUAL_PROJECT.appspot.com",   // Replace this
  messagingSenderId: "YOUR_ACTUAL_SENDER_ID",  // Replace this
  appId: "YOUR_ACTUAL_APP_ID"              // Replace this
};
```

## Step 3: Verify Firebase Authentication is Enabled

1. In Firebase Console, go to Authentication
2. Click on "Sign-in method" tab
3. Make sure "Email/Password" is enabled
4. Your existing users should appear in the "Users" tab

## Step 4: Test the Integration

1. Run your app: `npm start`
2. Try signing in with existing credentials
3. Check the console logs for Firebase authentication messages
4. The app should now have automatic token refresh (no more 1-hour limit!)

## Important Notes

### ⚠️ Security
- **Never commit your Firebase config to public repositories** if your API key has restrictions
- The Firebase config in client apps is meant to be public, but ensure your Firebase Security Rules are properly configured

### 🔄 Token Refresh
- Firebase will now handle all token refresh automatically
- Your "Keep me logged in" feature will work indefinitely
- No more 1-hour token expiration issues

### 🔍 Debugging
- Check browser/React Native debugger console for Firebase logs
- Look for messages starting with "Firebase" or "AuthProvider"
- Firebase auth state changes will be logged automatically

## Troubleshooting

### "Firebase project not found" error
- Double-check your `projectId` matches exactly with your backend
- Ensure the project exists and you have access

### "Auth domain not authorized" error  
- Go to Firebase Console → Authentication → Settings → Authorized domains
- Add your domain if needed (localhost should work by default)

### "Permission denied" errors
- Check Firebase Security Rules in Firestore/Storage
- Ensure rules allow authenticated users to read/write their data

### Still getting 1-hour token expiration
- Check console logs to ensure Firebase auth state listener is working
- Verify `onAuthStateChanged` logs appear when app starts
- Make sure you're using the updated SignInScreen with Firebase auth

## Success Indicators

✅ **You'll know it's working when:**
- Login succeeds with Firebase authentication logs
- Token refresh happens automatically (check logs)
- "Keep me logged in" works beyond 1 hour
- App stays logged in after restart (when keepLoggedIn = true)
- App logs out when going to background (when keepLoggedIn = false)

If you encounter any issues, check the console logs for detailed error messages. 