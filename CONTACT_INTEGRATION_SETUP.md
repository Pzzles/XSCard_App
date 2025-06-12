# Contact Integration Setup Guide

## Overview
The XS Card app now includes direct phone contact integration, allowing users to add contacts directly to their phone's contact list instead of exporting files.

## Current Status
- **Test Mode**: Currently enabled for Expo Go compatibility
- **Production Mode**: Requires native build with react-native-contacts

## Test Mode (Current)
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

### 4. Enable Production Mode
In `src/utils/contactExport.ts`, change:
```typescript
const TEST_MODE = true; // Change to false
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

## Fallback for Expo Go
When running in Expo Go (TEST_MODE = true):
- Shows detailed preview of what would be added
- Simulates the add contact flow
- No actual contacts are modified
- Helps with development and testing 