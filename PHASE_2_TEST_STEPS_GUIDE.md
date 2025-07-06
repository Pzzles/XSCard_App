# Phase 2 QR Code Check-in System - Test Steps Guide

## Overview
This guide provides comprehensive test steps for validating the Phase 2 QR code check-in system implementation, covering both backend API testing and frontend functionality testing.

## 🔧 Prerequisites

### Backend Setup
1. **Start the Backend Server**
   ```bash
   cd backend
   npm start
   ```
   - Server should be running on `http://localhost:8383`
   - Verify console shows "Server running on port 8383"

2. **Database Initialization**
   - Ensure Firebase/database is properly configured
   - Run any necessary database migrations
   - Verify test user accounts exist (see Postman collection for credentials)

### Frontend Setup
1. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

2. **Start Metro Bundler**
   ```bash
   npm start
   ```

3. **Run on Device/Simulator**
   ```bash
   npm run android  # For Android
   npm run ios      # For iOS
   ```

## 📋 Testing Phases

### Phase 1: Backend API Testing (Postman)

#### 1.1 Import and Setup Postman Collection
1. Open Postman
2. Import the collection file: `backend/XSCard_QR_CheckIn_API_Tests.postman_collection.json`
3. Verify collection variables are set:
   - `baseUrl`: `http://localhost:8383/api`
   - All other variables should be empty initially

#### 1.2 Execute API Test Sequence

**Step 1: Authentication & Setup**
```
✅ Run: "Login as Organizer"
   - Should return 200 OK
   - Verify authToken and organizerId are set in collection variables
   - Check console for confirmation logs

✅ Run: "Login as Attendee"
   - Should return 200 OK
   - Verify attendeeToken and userId are set in collection variables
   - Check console for confirmation logs
```

**Step 2: Event Management**
```
✅ Run: "Create Test Event"
   - Should return 201 Created
   - Verify eventId is set in collection variables
   - Check response contains event details

✅ Run: "Publish Event"
   - Should return 200 OK
   - Event status should change to "published"

✅ Run: "Register for Event (as Attendee)"
   - Should return 201 Created
   - Verify ticketId is set in collection variables
   - Check response contains ticket details
```

**Step 3: QR Code Generation**
```
✅ Run: "Generate QR Code for Ticket"
   - Should return 200 OK
   - Verify verificationToken is set
   - Check qrDataString is populated in variables
   - Verify QR code data structure is correct

✅ Run: "Generate Bulk QR Codes for Event"
   - Should return 200 OK
   - Check response contains bulk generation results
   - Verify no errors in bulk generation
```

**Step 4: QR Code Validation & Check-in**
```
✅ Run: "Validate QR Code"
   - Should return 200 OK
   - Verify QR code validation is successful
   - Check response contains attendee information

✅ Run: "Process Check-in"
   - Should return 200 OK
   - Verify check-in is successful
   - Check response contains check-in timestamp

✅ Run: "Attempt Double Check-in (Should Fail)"
   - Should return 400/409 Error
   - Verify error message indicates already checked in
   - Confirm duplicate check-in prevention works
```

**Step 5: Event Management & Statistics**
```
✅ Run: "Get Event Attendees"
   - Should return 200 OK
   - Verify attendee list includes registered user
   - Check attendee check-in status is updated

✅ Run: "Get Check-in Statistics"
   - Should return 200 OK
   - Verify statistics show correct counts
   - Check check-in rate calculation
```

**Step 6: Error Testing**
```
✅ Run: "Validate Invalid QR Code"
   - Should return 400 Error
   - Verify error type is INVALID_QR_FORMAT

✅ Run: "Validate Expired QR Code"
   - Should return 400 Error
   - Verify error type is INVALID_TOKEN or EXPIRED_TOKEN

✅ Run: "Unauthorized Check-in Attempt"
   - Should return 400 Error
   - Verify error type is UNAUTHORIZED_ORGANIZER
```

**Step 7: Cleanup**
```
✅ Run: "Unregister from Event"
   - Should return 200 OK
   - Verify attendee is removed from event

✅ Run: "Delete Test Event"
   - Should return 200 OK
   - Verify event is deleted
```

#### 1.3 API Test Results Verification
- [ ] All tests pass with expected status codes
- [ ] Authentication tokens are properly managed
- [ ] QR code generation and validation work correctly
- [ ] Check-in process functions as expected
- [ ] Error handling works for edge cases
- [ ] Statistics and attendee management are accurate

### Phase 2: Frontend Functionality Testing

#### 2.1 Navigation and Screen Access
**Test**: Access to QR-related screens
```
✅ Navigate to Events screen
✅ Select an event → Event Details
✅ Verify different action buttons for:
   - Attendees: "View Ticket" + "Unregister" buttons
   - Organizers: "Scan QR" + "Dashboard" buttons
```

#### 2.2 Attendee Ticket Flow
**Test**: QR Ticket Display (EventTicketScreen)
```
✅ As registered attendee, tap "View Ticket"
✅ Verify screen displays:
   - Event information
   - QR code with ticket data
   - Ticket details (registration date, etc.)
   - Brightness control slider
   - Share button functionality

✅ Test QR code generation:
   - QR code should be visible and scannable
   - Brightness control should adjust screen brightness
   - Share functionality should work
   - Loading states should display during QR generation
```

#### 2.3 Organizer QR Scanner Flow
**Test**: QR Code Scanning (QRScannerScreen)
```
✅ As event organizer, tap "Scan QR"
✅ Verify camera permissions:
   - Permission request appears if not granted
   - Proper error message if permission denied
   - Camera view loads when permission granted

✅ Test scanning functionality:
   - Camera preview displays correctly
   - Scan area overlay with corner indicators visible
   - Flash toggle button works
   - Pause/Resume scanning controls work

✅ Test QR code scanning:
   - Scan a valid attendee QR code
   - Verify success modal appears with attendee info
   - Check vibration feedback occurs
   - Confirm attendee is marked as checked in

✅ Test error scenarios:
   - Scan invalid QR code → Error message
   - Scan already used QR code → Error message
   - Test network connectivity issues
```

#### 2.4 Organizer Dashboard Flow
**Test**: Check-in Dashboard (CheckInDashboard)
```
✅ From Event Details, tap "Dashboard"
✅ Verify dashboard displays:
   - Event information header
   - Statistics cards (Total, Checked In, Pending, Rate)
   - Charts and analytics
   - Complete attendee list

✅ Test functionality:
   - Pull-to-refresh updates data
   - "Scan QR Code" button navigates to scanner
   - "Export CSV" button triggers export
   - Attendee items are tappable for details

✅ Test attendee detail modal:
   - Tap attendee → Modal opens
   - Displays complete attendee information
   - Shows check-in status and timestamp
   - Close button works correctly

✅ Test real-time updates:
   - Check-in an attendee via scanner
   - Return to dashboard
   - Verify statistics and list are updated
```

#### 2.5 Integration Testing
**Test**: End-to-End User Flows
```
✅ Complete Attendee Flow:
   1. Register for event
   2. View ticket and QR code
   3. Present QR code for scanning
   4. Verify check-in confirmation

✅ Complete Organizer Flow:
   1. Create and publish event
   2. Access event dashboard
   3. Scan attendee QR codes
   4. View real-time statistics
   5. Export attendee data

✅ Cross-User Scenario:
   1. User A registers for event
   2. User B (organizer) scans User A's QR
   3. Verify User A receives check-in confirmation
   4. Verify dashboard updates for User B
```

#### 2.6 Error Handling Testing
**Test**: Error Scenarios and Edge Cases
```
✅ Network connectivity issues:
   - Test with poor/no internet connection
   - Verify proper error messages display
   - Check retry mechanisms work

✅ Camera-related errors:
   - Test camera permission denial
   - Test with camera hardware issues
   - Verify fallback mechanisms

✅ Data validation errors:
   - Test with corrupted QR codes
   - Test with expired tokens
   - Verify proper error messaging

✅ Authentication errors:
   - Test with expired auth tokens
   - Test unauthorized access attempts
   - Verify proper redirect to login
```

### Phase 3: Performance and UI Testing

#### 3.1 Performance Testing
```
✅ QR Code Generation Speed:
   - Should generate within 2-3 seconds
   - No memory leaks during repeated generation

✅ Camera Performance:
   - Smooth camera preview
   - Fast QR code detection (< 1 second)
   - No frame drops or stuttering

✅ Dashboard Loading:
   - Statistics load within 3-5 seconds
   - Charts render smoothly
   - List scrolling is responsive
```

#### 3.2 UI/UX Testing
```
✅ Visual Design:
   - Consistent color scheme
   - Proper spacing and typography
   - Clear visual hierarchy

✅ Responsive Design:
   - Works on different screen sizes
   - Proper scaling of QR codes
   - Accessible touch targets

✅ User Feedback:
   - Loading states during operations
   - Success/error toast notifications
   - Vibration feedback for QR scans
   - Clear progress indicators
```

## 🎯 Success Criteria

### Backend API Tests
- [ ] All Postman tests pass (100% success rate)
- [ ] Response times under 5 seconds
- [ ] Proper error codes and messages
- [ ] Authentication flow works correctly
- [ ] QR code generation and validation functional

### Frontend Tests
- [ ] All screens load without crashes
- [ ] Camera functionality works on device
- [ ] QR code scanning detects codes accurately
- [ ] Real-time data updates function correctly
- [ ] Navigation flows work as expected

### Integration Tests
- [ ] End-to-end flows complete successfully
- [ ] Cross-user interactions work correctly
- [ ] Error handling provides good user experience
- [ ] Performance meets acceptable standards

## 🐛 Common Issues and Troubleshooting

### Backend Issues
1. **Server Connection Failed**
   - Check server is running on port 8383
   - Verify firewall/network settings
   - Check console for error messages

2. **Authentication Failures**
   - Verify user credentials in Postman
   - Check token expiration
   - Ensure user accounts exist in database

3. **Database Errors**
   - Check database connection
   - Verify table structures exist
   - Check for missing migrations

### Frontend Issues
1. **Camera Not Working**
   - Check device permissions
   - Test on physical device (not simulator)
   - Verify Expo Camera installation

2. **QR Code Not Generating**
   - Check API connectivity
   - Verify authentication tokens
   - Check console for errors

3. **Navigation Errors**
   - Check TypeScript compilation
   - Verify navigation types
   - Ensure all screens are properly registered

### General Issues
1. **Metro Bundler Issues**
   - Clear cache: `npx react-native start --reset-cache`
   - Restart Metro bundler
   - Check for conflicting dependencies

2. **Build Failures**
   - Run `npm install` to update dependencies
   - Check for TypeScript errors
   - Verify Expo CLI version

## 📊 Test Report Template

### Test Execution Summary
- **Test Date**: [Date]
- **Test Environment**: [Development/Staging]
- **Tester**: [Name]

### Results
- **Backend API Tests**: ✅/❌ (X/Y passed)
- **Frontend Tests**: ✅/❌ (X/Y passed)
- **Integration Tests**: ✅/❌ (X/Y passed)

### Issues Found
1. **Issue 1**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to Reproduce**: [Steps]
   - **Expected Result**: [Expected]
   - **Actual Result**: [Actual]

### Recommendations
- [List of improvements or fixes needed]

### Sign-off
- **Backend Development**: ✅ Ready for production
- **Frontend Development**: ✅ Ready for production
- **Overall System**: ✅ Ready for deployment

---

## 🎉 Conclusion

Following these test steps will ensure the Phase 2 QR code check-in system is fully functional and ready for production deployment. The comprehensive testing covers all aspects from API functionality to user experience, ensuring a robust and reliable system.
