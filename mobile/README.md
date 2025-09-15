# SwiftTrack - Delivery Driver Web Platform

SwiftTrack is a modern web-based platform for delivery drivers, built with React, TypeScript, and Tailwind CSS. It connects to a microservices backend architecture to provide real-time delivery management, order tracking, and driver profile management.

## 🚀 Features

### ✅ Completed Integrations

- **Authentication System**: Full integration with auth service for driver registration and login
- **Real-time Dashboard**: Live delivery order management with status updates
- **Profile Management**: Complete driver profile with statistics and editable information
- **Order Tracking**: Real-time order status updates (Picking → Picked Up → Delivering → Delivered)
- **Responsive Design**: Mobile-first design that works on all devices
- **Error Handling**: Robust error handling with user-friendly messages
- **Token Management**: Secure JWT token handling with automatic refresh

### 🔄 Backend Integration

The platform integrates with the following microservices:

1. **Auth Service** (Port 5001): Driver registration, login, profile management
2. **Delivery Service** (Port 5005): Order management, status updates, delivery tracking
3. **API Gateway** (Port 5000): Central routing and service discovery

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: Tailwind CSS, Shadcn/ui components
- **State Management**: React hooks (useState, useEffect, useCallback)
- **HTTP Client**: Fetch API with custom error handling
- **Authentication**: JWT tokens with localStorage persistence
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 🚀 Getting Started

### Prerequisites
1. Node.js 18+
2. Backend microservices running (see backend setup)
3. Docker for infrastructure services (Kafka, Zookeeper)

### Installation

```sh
# Step 1: Navigate to the mobile directory
cd mobile

# Step 2: Install the necessary dependencies
npm install

# Step 3: Start the development server
npm run dev

# Step 4: Open your browser and navigate to http://localhost:5173
```

### Backend Setup
Before using the web platform, ensure the backend services are running:

```bash
# Step 1: Start infrastructure services (Kafka, Zookeeper)
cd backend
docker-compose up -d

# Step 2: Start individual microservices in separate terminals
# Terminal 1 - API Gateway
cd backend/api_gateway && npm install && npm start

# Terminal 2 - Auth Service  
cd backend/auth_service && npm install && npm start

# Terminal 3 - Delivery Service
cd backend/delivery_service && npm install && npm start
```

## 📱 User Journey

### New Driver Registration
1. **Sign Up**: Complete registration form with personal details
2. **Verification**: Email and form validation
3. **Auto Login**: Automatic login after successful registration
4. **Profile Setup**: Complete profile with vehicle information

### Daily Workflow
1. **Sign In**: Login with email and password
2. **Dashboard**: View available delivery orders
3. **Accept Orders**: Select orders for pickup
4. **Status Updates**: Update order status through the workflow:
   - **Select** → Choose order for pickup
   - **Picking Up** → En route to restaurant/pickup location
   - **Picked Up** → Order collected, ready for delivery
   - **Delivering** → En route to customer
   - **Delivered** → Order successfully delivered
5. **Profile Management**: Update personal information and view statistics

## 🔧 API Configuration

The API configuration can be found in `src/lib/api.ts`:

```typescript
const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',        // API Gateway
  AUTH_SERVICE_URL: 'http://localhost:5001',// Direct auth service
  DELIVERY_SERVICE_URL: 'http://localhost:5005', // Direct delivery service
  TIMEOUT: 10000,                           // Request timeout (ms)
};
```

---

**SwiftTrack** - Empowering delivery drivers with modern technology 🚚✨
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/3a133473-09e7-45a7-ad73-baba6dfd6c80) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)
