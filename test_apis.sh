#!/bin/bash

# Backend API Testing Script
# This script tests all major API endpoints with sample data

BASE_URL="http://localhost:5000"
AUTH_SERVICE="http://localhost:5001"
ORDER_SERVICE="http://localhost:5003"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== Microservices API Testing Script ===${NC}"
echo ""

# Function to make HTTP requests and display results
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local description=$4
    
    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Request: $method $url"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$url")
    fi
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    # Extract response body (all except last line)
    response_body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" -eq 200 ] || [ "$http_code" -eq 201 ]; then
        echo -e "${GREEN}✓ SUCCESS ($http_code)${NC}"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body"
    else
        echo -e "${RED}✗ FAILED ($http_code)${NC}"
        echo "$response_body"
    fi
    
    echo ""
    echo "---"
    echo ""
}

# 1. Health Checks
echo -e "${YELLOW}=== HEALTH CHECKS ===${NC}"
test_endpoint "GET" "$BASE_URL/health" "" "API Gateway Health"
test_endpoint "GET" "$AUTH_SERVICE/health" "" "Auth Service Health"
test_endpoint "GET" "$ORDER_SERVICE/health" "" "Order Service Health"

# 2. Service Info
echo -e "${YELLOW}=== SERVICE INFO ===${NC}"
test_endpoint "GET" "$AUTH_SERVICE/info" "" "Auth Service Info"
test_endpoint "GET" "$ORDER_SERVICE/info" "" "Order Service Info"

# 3. Client Registration and Authentication
echo -e "${YELLOW}=== AUTHENTICATION ===${NC}"

CLIENT_DATA='{
  "name": "Test Business Ltd",
  "email": "test@business.com",
  "password": "password123",
  "phoneNo": "+94771234567",
  "businessType": "E-commerce Retailer",
  "city": "Colombo",
  "address": "123 Main Street, Colombo"
}'

test_endpoint "POST" "$BASE_URL/api/client/register" "$CLIENT_DATA" "Register Client"

LOGIN_DATA='{
  "email": "test@business.com",
  "password": "password123",
  "userType": "client"
}'

# Get client profile (assuming clientId = 1 for testing)
PROFILE_DATA='{"userId": 1}'
test_endpoint "POST" "$BASE_URL/api/client/profile" "$PROFILE_DATA" "Get Client Profile"

# 4. Order Management
echo -e "${YELLOW}=== ORDER MANAGEMENT ===${NC}"

ORDER_DATA='{
  "senderName": "John Doe",
  "receiverName": "Jane Smith",
  "receiverPhone": "+94771234568",
  "pickupAddress": "123 Sender Street, Colombo 03",
  "destinationAddress": "456 Receiver Avenue, Kandy",
  "clientId": 1,
  "packageDetails": "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard.",
  "specialInstructions": "Handle with care - fragile electronics"
}'

test_endpoint "POST" "$BASE_URL/api/orders" "$ORDER_DATA" "Create Order"

# Test order fetching (assuming clientId = 1)
test_endpoint "GET" "$BASE_URL/api/orders/client/1?page=1&limit=10" "" "Get Orders by Client ID"

# Test with status filter
test_endpoint "GET" "$BASE_URL/api/orders/client/1?page=1&limit=10&status=Pending" "" "Get Orders with Status Filter"

# Test order statistics
test_endpoint "GET" "$BASE_URL/api/orders/statistics?clientId=1" "" "Get Order Statistics"

# 5. Create additional test data
echo -e "${YELLOW}=== ADDITIONAL TEST DATA ===${NC}"

EXPRESS_ORDER='{
  "senderName": "Alice Johnson",
  "receiverName": "Bob Wilson",
  "receiverPhone": "+94771234569",
  "pickupAddress": "789 Business Center, Colombo 02",
  "destinationAddress": "321 Home Street, Galle",
  "clientId": 1,
  "packageDetails": "3 items, 1.8kg total. Categories: 1x Electronics (0.8kg), 2x Clothing (1.0kg). Priority: express.",
  "specialInstructions": "Deliver before 5 PM"
}'

test_endpoint "POST" "$BASE_URL/api/orders" "$EXPRESS_ORDER" "Create Express Order"

URGENT_ORDER='{
  "senderName": "Emergency Sender",
  "receiverName": "Urgent Receiver",
  "receiverPhone": "+94771234570",
  "pickupAddress": "Emergency Pickup Location, Colombo 01",
  "destinationAddress": "Critical Delivery Point, Negombo",
  "clientId": 1,
  "packageDetails": "1 items, 0.5kg total. Categories: 1x Medical Supplies (0.5kg). Priority: urgent.",
  "specialInstructions": "URGENT - Medical supplies for hospital"
}'

test_endpoint "POST" "$BASE_URL/api/orders" "$URGENT_ORDER" "Create Urgent Order"

# Final order list check
test_endpoint "GET" "$BASE_URL/api/orders/client/1?page=1&limit=20" "" "Final Orders List Check"

echo -e "${GREEN}=== API Testing Complete ===${NC}"
echo -e "${YELLOW}Note: If you see 'command not found: jq' errors, install jq for better JSON formatting${NC}"
echo -e "${YELLOW}Install jq: sudo apt-get install jq (Linux) or brew install jq (Mac)${NC}"