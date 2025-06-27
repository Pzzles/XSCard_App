# Firestore Indexes Required for XSCard Events

This document lists all composite indexes required for the XSCard Events system to function properly.

## Events Collection Indexes

### 1. Public Events Query
**Fields:**
- `status` (Ascending)
- `eventDate` (Ascending) 
- `__name__` (Ascending)

**Used by:** `GET /events/public`

### 2. Category Filter Query
**Fields:**
- `category` (Ascending)
- `status` (Ascending)
- `eventDate` (Ascending)
- `__name__` (Ascending)

**Used by:** `GET /events/public?category=tech`

### 3. User Created Events Query
**Fields:**
- `organizerId` (Ascending)
- `createdAt` (Descending)
- `__name__` (Descending)

**Used by:** `GET /user/events`

## Event Registrations Collection Indexes

### 4. User Registrations Query
**Fields:**
- `userId` (Ascending)
- `registeredAt` (Descending)
- `__name__` (Descending)

**Used by:** `GET /user/registrations`

## Index Creation Commands

### Firebase CLI (Alternative Method)
```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy indexes from firestore.indexes.json
firebase deploy --only firestore:rules,firestore:indexes
```

### Manual Creation URLs
When you encounter index errors, the Firebase error messages will contain direct URLs like:
```
https://console.firebase.google.com/v1/r/project/xscard-addd4/firestore/indexes?create_composite=...
```

Click these URLs to create the indexes automatically.

## Index Status Monitoring

You can monitor index creation status at:
```
https://console.firebase.google.com/project/xscard-addd4/firestore/indexes
```

Indexes typically take 2-10 minutes to build depending on existing data size.

## Future Index Planning

When adding new queries, consider:
1. **Single field queries** - Usually don't need composite indexes
2. **Multi-field queries** - Always need composite indexes
3. **orderBy + where** combinations - Need composite indexes
4. **Array membership queries** - May need special consideration

## Troubleshooting

If indexes fail to create:
1. Check Firebase quotas and limits
2. Verify field names match exactly (case-sensitive)
3. Ensure you have Firestore admin permissions
4. Try creating indexes one at a time if batch creation fails 