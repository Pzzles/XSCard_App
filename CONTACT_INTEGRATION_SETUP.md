# Contact Integration Setup Guide

## Overview
The XS Card app now includes direct phone contact integration, allowing users to add contacts directly to their phone's contact list instead of exporting files.

## Current Status
- **Test Mode**: Currently disabled (production mode active)
- **Production Mode**: Requires native build with react-native-contacts

## Test Mode Configuration
Test mode is now centrally managed in `src/config/testMode.ts`:
- Shows preview dialogs of what would be added to contacts
- No actual contacts are added to the phone
- Works in Expo Go for development/testing

## Production Setup

### 1. Install Dependencies
```bash
npm install react-native-contacts
```

### 2. iOS Setup
Add to `ios/YourApp/Info.plist`:
```xml
<key>NSContactsUsageDescription</key>
<string>This app needs access to contacts to save business card information directly to your phone.</string>
```

### 3. Android Setup
Add to `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.READ_CONTACTS" />
<uses-permission android:name="android.permission.WRITE_CONTACTS" />
```

### 4. Configure Test Mode (if needed)
In `src/config/testMode.ts`, change:
```typescript
export const TEST_MODE = false; // true for test mode, false for production
```

### 5. Build Native App
```bash
# For iOS
npx react-native run-ios

# For Android  
npx react-native run-android
```

## Features
- **Add Single Contact**: Adds individual contact to phone with all details
- **Add All Contacts**: Batch adds all contacts to phone
- **Permission Handling**: Automatically requests contact permissions
- **Error Handling**: Graceful fallbacks for permission denials
- **Cross-Platform**: Works on both iOS and Android

## User Experience
1. User taps "Add to Phone" on a contact
2. App requests contact permissions (if needed)
3. Contact is added directly to phone's contact app
4. Success confirmation shown to user

## Technical Details
- Uses `react-native-contacts` library
- Converts app contact format to native contact format
- Handles permissions automatically
- Includes contact notes with "Met at" information
- Supports phone numbers and email addresses
- Centralized test mode configuration

## Test Mode vs Production Mode

### Test Mode (TEST_MODE = true)
- Shows detailed preview of what would be added
- Simulates the add contact flow
- No actual contacts are modified
- Works in Expo Go
- Helps with development and testing

### Production Mode (TEST_MODE = false)
- Full native contact integration
- Actually adds contacts to phone
- Requires react-native-contacts dependency
- Needs native build (not Expo Go)
- Real permission requests and handling

## Migration Notes
- **TODO**: Remove TEST_MODE entirely once full native builds are standard
- All test mode logic is centralized in `src/config/testMode.ts`
- Easy to toggle between test and production modes during development 