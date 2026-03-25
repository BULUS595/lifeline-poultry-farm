# API INTEGRATION GUIDE - Life-Line Poultry Solutions

This guide shows how to integrate the PWA frontend with a backend API.

## 🌐 Current Setup

The frontend expects API at: `http://localhost:3000/api`

This can be changed in:
- `src/services/authService.ts` - Line: `const API_BASE = ...`
- `src/services/dataService.ts` - Line: `const API_BASE = ...`

---

## 📋 Required API Endpoints

### Authentication

#### POST /auth/login
```javascript
// Request
{
  "email": "staff@farm.local",
  "password": "password123"
}

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-123",
    "email": "staff@farm.local",
    "name": "John Doe",
    "role": "worker|farm_manager|super_admin",
    "farmIds": ["farm-1", "farm-2"],
    "createdAt": "2026-01-01T00:00:00Z",
    "lastLogin": "2026-03-20T12:00:00Z",
    "isActive": true
  }
}
```

#### POST /auth/logout
```javascript
// Request (no body)
// Header: Authorization: Bearer <token>

// Response
{
  "success": true
}
```

#### POST /auth/refresh
```javascript
// Request
// Header: Authorization: Bearer <old_token>

// Response
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### User Management

#### GET /users
```javascript
// Query: ?farmId=farm-1&role=worker
// Header: Authorization: Bearer <token>

// Response
[
  {
    "id": "user-123",
    "email": "staff@farm.local",
    "name": "John Doe",
    "role": "worker",
    "farmIds": ["farm-1"],
    "isActive": true
  }
]
```

#### POST /users/create (Admin Only)
```javascript
// Request
{
  "email": "newstaff@farm.local",
  "name": "New Staff",
  "role": "worker|farm_manager",
  "farmIds": ["farm-1"]
}

// Response
{
  "id": "user-456",
  "email": "newstaff@farm.local",
  "name": "New Staff",
  "role": "worker",
  "farmIds": ["farm-1"],
  "createdAt": "2026-03-20T12:00:00Z",
  "isActive": true
}
```

#### PUT /users/:userId
```javascript
// Request
{
  "name": "Updated Name",
  "isActive": true
}

// Response - Updated user object
```

#### DELETE /users/:userId (Admin Only)
```javascript
// Response
{
  "success": true,
  "deletedUser": {...}
}
```

---

### Farm Management

#### GET /farms
```javascript
// Header: Authorization: Bearer <token>
// Response: Farm[]

[
  {
    "id": "farm-1",
    "name": "Main Farm",
    "location": "North Valley",
    "totalBirds": 5000,
    "birdType": "Broiler",
    "createdAt": "2026-01-01T00:00:00Z",
    "managedBy": "user-123",
    "staffIds": ["user-124", "user-125"]
  }
]
```

#### GET /farms/:farmId
```javascript
// Response: Single Farm object
```

#### POST /farms (Admin Only)
```javascript
// Request
{
  "name": "New Farm",
  "location": "South Area",
  "totalBirds": 3000,
  "birdType": "Broiler",
  "managedBy": "user-456"
}

// Response: Created Farm
```

#### PUT /farms/:farmId (Manager/Admin)
```javascript
// Request - Any fields to update
{
  "totalBirds": 4500,
  "location": "Updated Location"
}

// Response: Updated Farm
```

---

### Mortality Logs

#### POST /mortality-logs
```javascript
// Request
{
  "farmId": "farm-1",
  "workerId": "user-123",
  "date": "2026-03-20",
  "count": 3,
  "cause": "Disease",
  "notes": "Some birds had respiratory issues"
}

// Response
{
  "id": "mortality-123",
  "farmId": "farm-1",
  "workerId": "user-123",
  "date": "2026-03-20T00:00:00Z",
  "count": 3,
  "cause": "Disease",
  "notes": "Some birds had respiratory issues",
  "createdAt": "2026-03-20T14:30:00Z",
  "synced": true
}
```

#### GET /mortality-logs/:farmId
```javascript
// Query: ?startDate=2026-03-01&endDate=2026-03-31&workerId=user-123

// Response: MortalityLog[]
```

#### PUT /mortality-logs/:id
```javascript
// Request - Fields to update
{
  "count": 4,
  "notes": "Updated notes"
}

// Response: Updated MortalityLog
```

#### DELETE /mortality-logs/:id
```javascript
// Response
{
  "success": true,
  "deletedId": "mortality-123"
}
```

---

### Feeding Logs

#### POST /feeding-logs
```javascript
// Request
{
  "farmId": "farm-1",
  "workerId": "user-123",
  "date": "2026-03-20",
  "quantity": 250,
  "unit": "kg",
  "feedType": "Standard Mix",
  "time": "08:00",
  "notes": "Used new batch of feed"
}

// Response: FeedingLog object
```

#### GET /feeding-logs/:farmId
```javascript
// Query: ?startDate=2026-03-01&endDate=2026-03-31
// Response: FeedingLog[]
```

#### PUT/DELETE - Same pattern as mortality logs
```

---

### Medicine Schedules

#### POST /medicine-schedules
```javascript
// Request
{
  "farmId": "farm-1",
  "medicineType": "Antibiotic XXX",
  "description": "Treatment for respiratory disease",
  "scheduledDate": "2026-03-25",
  "frequency": "once|daily|weekly|monthly",
  "endDate": "2026-03-27",
  "dosage": "5ml per 100 birds",
  "assignedTo": ["user-123", "user-124"],
  "createdBy": "admin-user-id"
}

// Response: MedicineSchedule object
```

#### GET /medicine-schedules/:farmId
```javascript
// Query: ?status=pending&assignedTo=user-123
// Response: MedicineSchedule[]
```

---

### Medicine Completions

#### POST /medicine-completions
```javascript
// Request
{
  "scheduleId": "schedule-123",
  "workerId": "user-123",
  "farmId": "farm-1",
  "completedAt": "2026-03-25T10:00:00Z",
  "notes": "Administered to all birds successfully"
}

// Response: MedicineCompletion object
```

#### GET /medicine-completions/:scheduleId
```javascript
// Response: MedicineCompletion[]
```

---

### Expenses

#### POST /expenses
```javascript
// Request
{
  "farmId": "farm-1",
  "date": "2026-03-20",
  "category": "feed|medicine|equipment|labor|utilities|other",
  "amount": 500.50,
  "description": "Purchase of feed bags",
  "createdBy": "admin-user-id",
  "receipt": "base64-encoded-image"  // optional
}

// Response: Expense object
```

#### GET /expenses/:farmId
```javascript
// Query: ?startDate=2026-03-01&endDate=2026-03-31&category=feed
// Response: Expense[]
```

---

### Sales

#### POST /sales
```javascript
// Request
{
  "farmId": "farm-1",
  "date": "2026-03-20",
  "quantity": 100,
  "unit": "kg|pieces|lbs",
  "pricePerUnit": 200,
  "totalAmount": 20000,
  "buyer": "Local Market",
  "notes": "Bulk order",
  "receiptNumber": "RCP-001"
}

// Response: Sale object
```

#### GET /sales/:farmId
```javascript
// Response: Sale[]
```

---

### Activity Logs

#### GET /activity-logs/:farmId
```javascript
// Query: ?userId=user-123&action=create&dataType=mortality_logs

// Response
[
  {
    "id": "activity-123",
    "userId": "user-123",
    "farmId": "farm-1",
    "action": "create|update|delete",
    "dataType": "mortality|feeding|medicine|expense|sale|user|farm",
    "dataId": "mortality-123",
    "changes": { "count": { "old": 2, "new": 3 } },
    "timestamp": "2026-03-20T14:30:00Z"
  }
]
```

---

### Tasks

#### POST /tasks
```javascript
// Request
{
  "farmId": "farm-1",
  "title": "Clean the coop",
  "description": "Full cleaning of house 1",
  "assignedTo": ["user-123", "user-124"],
  "dueDate": "2026-03-22",
  "priority": "low|medium|high"
}

// Response: Task object
```

#### GET /tasks/:farmId
```javascript
// Query: ?status=pending|in_progress|completed&assignedTo=user-123
// Response: Task[]
```

#### PUT /tasks/:taskId
```javascript
// Request
{
  "status": "completed"
}

// Response: Updated Task
```

---

## 🔐 Authentication Headers

All API requests (except /auth/login) require:

```javascript
// Request header
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

The token is obtained from login response and stored in:
- localStorage under key: `auth_token`

---

## ⚠️ Error Handling

The frontend expects consistent error responses:

```javascript
// Error Response (400-500)
{
  "error": "Invalid request",
  "message": "Email is required",
  "code": "VALIDATION_ERROR"
}
```

**Common error codes:**
- `UNAUTHORIZED` - No/invalid token
- `FORBIDDEN` - No permission for action
- `NOT_FOUND` - Resource doesn't exist
- `VALIDATION_ERROR` - Invalid input
- `CONFLICT` - Resource already exists
- `SERVER_ERROR` - Backend error

---

## 🔄 Pagination (Optional)

For lists, implement pagination:

```javascript
// Request
GET /farms?page=1&limit=10&sort=-createdAt

// Response
{
  "data": [...],
  "total": 45,
  "page": 1,
  "limit": 10,
  "totalPages": 5
}
```

---

## 🔐 Authorization Rules

### Super Admin
- ✅ All endpoints
- ✅ All actions (create/read/update/delete)

### Farm Manager
- ✅ GET /farms - own farms only
- ✅ POST /farms - own farms only  
- ✅ All data endpoints for own farms
- ❌ DELETE users
- ❌ Create other managers
- ❌ View other farms

### Worker
- ✅ POST /mortality-logs - own farm only
- ✅ POST /feeding-logs - own farm only
- ✅ POST /medicine-completions - own farm only
- ✅ GET active tasks
- ✅ GET own activity
- ❌ All other endpoints

---

## 💾 Sync Endpoint (Optional)

For syncing offline changes:

```javascript
// POST /sync
// Request
{
  "changes": [
    {
      "type": "mortality_logs",
      "action": "create",
      "data": {...},
      "timestamp": "2026-03-20T14:30:00Z"
    }
  ]
}

// Response
{
  "synced": 5,
  "failed": 0,
  "conflicts": [],
  "timestamp": "2026-03-20T14:35:00Z"
}
```

---

## 🧪 Testing with cURL

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@farm.local",
    "password": "password123"
  }'
```

### Get Farms
```bash
curl -X GET http://localhost:3000/api/farms \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Mortality Log
```bash
curl -X POST http://localhost:3000/api/mortality-logs \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "farmId": "farm-1",
    "workerId": "user-123",
    "date": "2026-03-20",
    "count": 3,
    "cause": "Disease"
  }'
```

---

## 📝 Response Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Server Error |

---

## 🚀 Testing the Integration

After API implementation:

1. **Test login:**
   ```bash
   npm run dev
   Login with valid credentials
   ```

2. **Check network tab:**
   - DevTools → Network
   - Login request shows 200 response
   - Token stored in localStorage

3. **Test data operations:**
   - Create mortality log
   - Check API network request
   - Verify data saved in backend

4. **Test offline sync:**
   - Go offline in DevTools
   - Create log (saves to IndexedDB)
   - Go online
   - Auto-sync to backend

---

## 📚 Backend Framework Recommendations

### Node.js + Express
```javascript
const express = require('express');
const app = express();

app.post('/api/auth/login', async (req, res) => {
  // Implementation
});
```

### Middleware Checklist
- ✅ CORS enabled
- ✅ JSON parser
- ✅ JWT verification
- ✅ Error handler
- ✅ Request logging
- ✅ Rate limiting

---

**All endpoints ready for implementation! 🚀**

*For frontend implementation details, see the service files.*
