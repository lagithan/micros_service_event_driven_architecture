# Backend Data Fetching API Documentation & Test Data

## 🚀 API Base URLs

- **API Gateway**: `http://localhost:5000`
- **Auth Service**: `http://localhost:5001`  
- **Order Service**: `http://localhost:5003`

## 📋 Prerequisites for Testing

1. Start all services:
   ```bash
   cd backend
   docker-compose up -d  # or start individual services
   ```

2. Import the Postman collection: `postman_collection.json`

3. Set up environment variables in Postman:
   - `baseUrl`: `http://localhost:5000`
   - `authService`: `http://localhost:5001`
   - `orderService`: `http://localhost:5003`

## 🔐 Authentication Endpoints

### 1. Register Client
**POST** `/api/client/register`

**Request Body:**
```json
{
  "name": "Test Business Ltd",
  "email": "test@business.com",
  "password": "password123",
  "phoneNo": "+94771234567",
  "businessType": "E-commerce Retailer",
  "city": "Colombo",
  "address": "123 Main Street, Colombo"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Client registered successfully",
  "data": {
    "user": {
      "id": 1,
      "username": "test_client",
      "email": "test@business.com",
      "userType": "client",
      "createdAt": "2025-09-17T10:30:00.000Z"
    },
    "profile": {
      "id": 1,
      "name": "Test Business Ltd",
      "email": "test@business.com",
      "phoneNo": "+94771234567",
      "businessType": "E-commerce Retailer",
      "city": "Colombo",
      "address": "123 Main Street, Colombo",
      "createdAt": "2025-09-17T10:30:00.000Z"
    }
  }
}
```

### 2. Login Client
**POST** `/api/auth/login`

**Request Body:**
```json
{
  "email": "test@business.com",
  "password": "password123",
  "userType": "client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "email": "test@business.com",
      "userType": "client"
    },
    "profile": {
      "id": 1,
      "name": "Test Business Ltd",
      "email": "test@business.com",
      "phoneNo": "+94771234567",
      "businessType": "E-commerce Retailer",
      "city": "Colombo",
      "address": "123 Main Street, Colombo"
    }
  }
}
```

### 3. Get Client Profile
**POST** `/api/client/profile`

**Request Body:**
```json
{
  "userId": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "test_client",
      "email": "test@business.com",
      "userType": "client",
      "createdAt": "2025-09-17T10:30:00.000Z",
      "updatedAt": "2025-09-17T10:30:00.000Z"
    },
    "profile": {
      "id": 1,
      "name": "Test Business Ltd",
      "email": "test@business.com",
      "phoneNo": "+94771234567",
      "businessType": "E-commerce Retailer",
      "city": "Colombo",
      "address": "123 Main Street, Colombo",
      "createdAt": "2025-09-17T10:30:00.000Z",
      "updatedAt": "2025-09-17T10:30:00.000Z"
    }
  }
}
```

## 📦 Order Management Endpoints

### 1. Create Order
**POST** `/api/orders`

**Request Body:**
```json
{
  "senderName": "John Doe",
  "receiverName": "Jane Smith",
  "receiverPhone": "+94771234568",
  "pickupAddress": "123 Sender Street, Colombo 03",
  "destinationAddress": "456 Receiver Avenue, Kandy",
  "clientId": 1,
  "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
  "specialInstructions": "Handle with care - fragile electronics"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": 1,
    "orderId": "ORD202509171001",
    "trackingNumber": "ST20250917100134567A",
    "senderName": "John Doe",
    "receiverName": "Jane Smith",
    "receiverPhone": "+94771234568",
    "pickupAddress": "123 Sender Street, Colombo 03",
    "destinationAddress": "456 Receiver Avenue, Kandy",
    "orderStatus": "Pending",
    "clientId": 1,
    "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
    "specialInstructions": "Handle with care - fragile electronics",
    "createdAt": "2025-09-17T10:35:00.000Z"
  }
}
```

### 2. Get Orders by Client ID
**GET** `/api/orders/client/{clientId}?page=1&limit=10`

**Response:**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": 1,
        "orderId": "ORD202509171001",
        "trackingNumber": "ST20250917100134567A",
        "senderName": "John Doe",
        "receiverName": "Jane Smith",
        "receiverPhone": "+94771234568",
        "pickupAddress": "123 Sender Street, Colombo 03",
        "destinationAddress": "456 Receiver Avenue, Kandy",
        "orderStatus": "Pending",
        "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
        "specialInstructions": "Handle with care - fragile electronics",
        "createdAt": "2025-09-17T10:35:00.000Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "limit": 10,
      "total": 1
    }
  }
}
```

### 3. Get Orders by Client ID with Status Filter
**GET** `/api/orders/client/{clientId}?page=1&limit=10&status=Pending`

Same response format as above, but filtered by status.

### 4. Get Order by Order ID
**GET** `/api/orders/order/{orderId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "orderId": "ORD202509171001",
    "trackingNumber": "ST20250917100134567A",
    "senderName": "John Doe",
    "receiverName": "Jane Smith",
    "receiverPhone": "+94771234568",
    "pickupAddress": "123 Sender Street, Colombo 03",
    "destinationAddress": "456 Receiver Avenue, Kandy",
    "orderStatus": "Pending",
    "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
    "specialInstructions": "Handle with care - fragile electronics",
    "createdAt": "2025-09-17T10:35:00.000Z",
    "estimatedDeliveryDate": "2025-09-19T18:00:00.000Z"
  }
}
```

### 5. Get Order by Tracking Number
**GET** `/api/orders/tracking/{trackingNumber}`

Same response format as Get Order by Order ID.

### 6. Track Order (with Status History)
**GET** `/api/orders/track/{trackingNumber}`

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": 1,
      "orderId": "ORD202509171001",
      "trackingNumber": "ST20250917100134567A",
      "senderName": "John Doe",
      "receiverName": "Jane Smith",
      "orderStatus": "Pending",
      "pickupAddress": "123 Sender Street, Colombo 03",
      "destinationAddress": "456 Receiver Avenue, Kandy",
      "createdAt": "2025-09-17T10:35:00.000Z",
      "estimatedDeliveryDate": "2025-09-19T18:00:00.000Z"
    },
    "statusHistory": [
      {
        "id": 1,
        "orderId": "ORD202509171001",
        "previousStatus": null,
        "newStatus": "Pending",
        "statusChangedBy": "system",
        "changeReason": "Order created",
        "changedAt": "2025-09-17T10:35:00.000Z"
      }
    ]
  }
}
```

### 7. Get Order Statistics
**GET** `/api/orders/statistics?clientId={clientId}`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalOrders": 15,
    "pendingOrders": 3,
    "pickedUpOrders": 5,
    "warehouseOrders": 2,
    "deliveredOrders": 4,
    "cancelledOrders": 1,
    "averageDeliveryTimeHours": 48.5
  }
}
```

### 8. Update Order Status
**PATCH** `/api/orders/{orderId}/status`

**Request Body:**
```json
{
  "newStatus": "PickedUp",
  "statusChangedBy": "Test Driver",
  "changeReason": "Package picked up from sender location",
  "location": "Colombo 03"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order status updated successfully",
  "data": {
    "orderId": "ORD202509171001",
    "previousStatus": "Pending",
    "newStatus": "PickedUp",
    "statusChangedBy": "Test Driver",
    "changeReason": "Package picked up from sender location",
    "location": "Colombo 03",
    "changedAt": "2025-09-17T11:00:00.000Z"
  }
}
```

### 9. Cancel Order
**PATCH** `/api/orders/{orderId}/cancel`

**Request Body:**
```json
{
  "cancelReason": "Customer requested cancellation",
  "cancelledBy": "Test Client"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "orderId": "ORD202509171001",
    "previousStatus": "Pending",
    "newStatus": "Cancelled",
    "cancelReason": "Customer requested cancellation",
    "cancelledBy": "Test Client",
    "cancelledAt": "2025-09-17T11:30:00.000Z"
  }
}
```

## 🏥 Health Check Endpoints

### 1. API Gateway Health
**GET** `/health`

### 2. Auth Service Health
**GET** `http://localhost:5001/health`

### 3. Order Service Health
**GET** `http://localhost:5003/health`

## 📊 Test Data Sets

### Sample Client Data
```json
[
  {
    "name": "TechStore Ltd",
    "email": "techstore@example.com",
    "password": "password123",
    "phoneNo": "+94771234567",
    "businessType": "E-commerce Retailer",
    "city": "Colombo",
    "address": "123 Tech Street, Colombo 03"
  },
  {
    "name": "Fashion Hub",
    "email": "fashion@example.com",
    "password": "fashion123",
    "phoneNo": "+94771234568",
    "businessType": "Online Marketplace",
    "city": "Kandy",
    "address": "456 Fashion Ave, Kandy"
  }
]
```

### Sample Order Data
```json
[
  {
    "senderName": "John Doe",
    "receiverName": "Jane Smith",
    "receiverPhone": "+94771234568",
    "pickupAddress": "123 Sender Street, Colombo 03",
    "destinationAddress": "456 Receiver Avenue, Kandy",
    "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
    "specialInstructions": "Handle with care - fragile electronics"
  },
  {
    "senderName": "Alice Johnson",
    "receiverName": "Bob Wilson",
    "receiverPhone": "+94771234569",
    "pickupAddress": "789 Business Center, Colombo 02",
    "destinationAddress": "321 Home Street, Galle",
    "packageDetails": "3 items, 1.8kg total. Categories: 1x Electronics (0.8kg), 2x Clothing (1.0kg). Priority: express.",
    "specialInstructions": "Deliver before 5 PM"
  },
  {
    "senderName": "Emergency Sender",
    "receiverName": "Urgent Receiver",
    "receiverPhone": "+94771234570",
    "pickupAddress": "Emergency Pickup Location, Colombo 01",
    "destinationAddress": "Critical Delivery Point, Negombo",
    "packageDetails": "1 items, 0.5kg total. Categories: 1x Medical Supplies (0.5kg). Priority: urgent.",
    "specialInstructions": "URGENT - Medical supplies for hospital"
  }
]
```

## 🔍 Testing Workflow

1. **Start Services**: Ensure all microservices are running
2. **Register Client**: Create a new client account
3. **Login**: Authenticate and get client profile
4. **Create Orders**: Add multiple test orders
5. **Fetch Orders**: Test order retrieval with different filters
6. **Track Orders**: Test tracking functionality
7. **Update Status**: Test status updates
8. **Get Statistics**: Verify aggregated data

## 📝 Postman Setup Instructions

1. Import `postman_collection.json`
2. Set environment variables:
   - `baseUrl`: `http://localhost:5000`
   - `authService`: `http://localhost:5001`
   - `orderService`: `http://localhost:5003`
3. Run the **Authentication** folder first to set up client data
4. Use the automatically extracted `clientId` for order operations
5. Test data fetching with various filters and parameters

## 🚨 Common Issues & Solutions

- **CORS Error**: Ensure services are running with proper CORS configuration
- **Database Connection**: Services will return mock data if database is unavailable
- **Port Conflicts**: Check if ports 5000, 5001, 5003 are available
- **Variable Extraction**: Postman scripts automatically extract IDs for chaining requests

This comprehensive API documentation provides all the necessary endpoints, test data, and workflows for testing your microservices backend data fetching functionality.