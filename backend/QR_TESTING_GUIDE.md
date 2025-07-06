# QR Code Check-in System - Quick Test Guide

## 🚀 Quick Start Testing

### Prerequisites
1. Backend server running (`npm start` in backend directory)
2. Postman installed
3. Valid user accounts (organizer and attendee)

### 📥 Import Test Collection

1. **Open Postman**
2. **Import Collection**: 
   - File → Import
   - Select `XSCard_QR_CheckIn_API_Tests.postman_collection.json`
3. **Set Environment Variables**:
   - `baseUrl`: Your backend URL (e.g., `http://localhost:8383/api`)

### 🎯 Test Flow

#### Phase 1: Authentication
1. **Login as Organizer** - Get organizer auth token
2. **Login as Attendee** - Get attendee auth token

#### Phase 2: Event Setup
3. **Create Test Event** - Creates a test event for QR testing
4. **Publish Event** - Makes event available for registration
5. **Register for Event (as Attendee)** - Creates ticket

#### Phase 3: QR Code Generation
6. **Generate QR Code for Ticket** - Creates QR code for attendee's ticket
7. **Generate Bulk QR Codes** - Creates QR codes for all attendees

#### Phase 4: Check-in Process
8. **Validate QR Code** - Validates QR without checking in
9. **Process Check-in** - Actually checks in the attendee
10. **Attempt Double Check-in** - Should fail with error

#### Phase 5: Management
11. **Get Event Attendees** - View all attendees and check-in status
12. **Get Check-in Statistics** - View event analytics

#### Phase 6: Error Testing
13. **Validate Invalid QR Code** - Test error handling
14. **Validate Expired QR Code** - Test expiration
15. **Unauthorized Check-in Attempt** - Test security

### 📊 Expected Results

#### ✅ Successful Responses
- **QR Generation**: Returns base64 QR code image and verification token
- **Validation**: Returns ticket and user information
- **Check-in**: Returns success with timestamp
- **Statistics**: Returns check-in counts and rates

#### ❌ Error Responses
- **Invalid QR**: `INVALID_QR_FORMAT` error
- **Expired QR**: `EXPIRED_TOKEN` error
- **Double Check-in**: `ALREADY_USED` error
- **Unauthorized**: `UNAUTHORIZED_ORGANIZER` error

### 🔧 Manual Testing Scenarios

#### Scenario 1: Happy Path
```
1. Organizer creates event
2. Attendee registers
3. Attendee generates QR code
4. Organizer validates QR code
5. Organizer processes check-in
6. System shows attendee as checked in
```

#### Scenario 2: Security Testing
```
1. Attendee tries to validate QR code (should fail)
2. Attendee tries to check-in (should fail)
3. Wrong organizer tries to check-in (should fail)
4. Attempt double check-in (should fail)
```

#### Scenario 3: Bulk Operations
```
1. Multiple attendees register
2. Organizer generates bulk QR codes
3. Organizer checks in multiple attendees
4. View comprehensive statistics
```

### 📱 QR Code Testing

The generated QR codes contain JSON data like:
```json
{
  "eventId": "event_123",
  "userId": "user_456", 
  "ticketId": "ticket_789",
  "verificationToken": "sha256_hash",
  "timestamp": 1703075200000,
  "type": "event_checkin",
  "version": "1.0"
}
```

You can:
1. Copy the QR data from the response
2. Use it in validation/check-in requests
3. Test with modified data to trigger errors

### 🔍 Monitoring

Watch the backend console for:
- QR generation logs
- Validation attempts
- Check-in processing
- Error handling
- Real-time notifications

### 📈 Performance Testing

Use Postman's Runner to:
1. Test multiple concurrent check-ins
2. Validate bulk QR generation performance
3. Test error handling under load

### 🛠️ Troubleshooting

#### Common Issues:
1. **Authentication Failed**: Check login credentials and token
2. **Event Not Found**: Ensure event was created and ID is correct
3. **QR Validation Failed**: Check QR data format and expiration
4. **Permission Denied**: Verify organizer permissions

#### Debug Tips:
1. Check backend console logs
2. Verify Firestore collections exist
3. Confirm auth tokens are valid
4. Test with fresh data

### ✅ Success Criteria

The implementation is working correctly if:
- [x] QR codes generate successfully
- [x] Validation returns proper user/event data
- [x] Check-in process completes without errors
- [x] Duplicate check-ins are prevented
- [x] Error scenarios return appropriate messages
- [x] Statistics show accurate data
- [x] Real-time notifications work

---

**Ready for Phase 2**: Frontend Implementation 🚀
