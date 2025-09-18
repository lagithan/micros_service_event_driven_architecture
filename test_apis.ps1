# Backend API Testing Script (PowerShell)
# This script tests all major API endpoints with sample data

$BaseUrl = "http://localhost:5000"
$AuthService = "http://localhost:5001"
$OrderService = "http://localhost:5003"

# Colors for output
$Green = "Green"
$Red = "Red"
$Yellow = "Yellow"

Write-Host "=== Microservices API Testing Script ===" -ForegroundColor Yellow
Write-Host ""

# Function to make HTTP requests and display results
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Url,
        [string]$Data = "",
        [string]$Description
    )
    
    Write-Host "Testing: $Description" -ForegroundColor Yellow
    Write-Host "Request: $Method $Url"
    
    try {
        $headers = @{ "Content-Type" = "application/json" }
        
        if ($Data) {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Body $Data -Headers $headers -ErrorAction Stop
        } else {
            $response = Invoke-RestMethod -Uri $Url -Method $Method -Headers $headers -ErrorAction Stop
        }
        
        Write-Host "✓ SUCCESS" -ForegroundColor Green
        $response | ConvertTo-Json -Depth 10 | Write-Host
        
    } catch {
        Write-Host "✗ FAILED ($($_.Exception.Response.StatusCode.value__))" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "---"
    Write-Host ""
}

# 1. Health Checks
Write-Host "=== HEALTH CHECKS ===" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Url "$BaseUrl/health" -Description "API Gateway Health"
Test-Endpoint -Method "GET" -Url "$AuthService/health" -Description "Auth Service Health"
Test-Endpoint -Method "GET" -Url "$OrderService/health" -Description "Order Service Health"

# 2. Service Info
Write-Host "=== SERVICE INFO ===" -ForegroundColor Yellow
Test-Endpoint -Method "GET" -Url "$AuthService/info" -Description "Auth Service Info"
Test-Endpoint -Method "GET" -Url "$OrderService/info" -Description "Order Service Info"

# 3. Client Registration and Authentication
Write-Host "=== AUTHENTICATION ===" -ForegroundColor Yellow

$ClientData = @{
    name = "Test Business Ltd"
    email = "test@business.com"
    password = "password123"
    phoneNo = "+94771234567"
    businessType = "E-commerce Retailer"
    city = "Colombo"
    address = "123 Main Street, Colombo"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$BaseUrl/api/client/register" -Data $ClientData -Description "Register Client"

$LoginData = @{
    email = "test@business.com"
    password = "password123"
    userType = "client"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$BaseUrl/api/auth/login" -Data $LoginData -Description "Login Client"

# Get client profile (assuming clientId = 1 for testing)
$ProfileData = @{ userId = 1 } | ConvertTo-Json
Test-Endpoint -Method "POST" -Url "$BaseUrl/api/client/profile" -Data $ProfileData -Description "Get Client Profile"

# 4. Order Management
Write-Host "=== ORDER MANAGEMENT ===" -ForegroundColor Yellow

$OrderData = @{
    senderName = "John Doe"
    receiverName = "Jane Smith"
    receiverPhone = "+94771234568"
    pickupAddress = "123 Sender Street, Colombo 03"
    destinationAddress = "456 Receiver Avenue, Kandy"
    clientId = 1
    packageDetails = "5 items, 2.5kg total. Categories: 2x Electronics (1.0kg), 3x Books (1.5kg). Priority: standard."
    specialInstructions = "Handle with care - fragile electronics"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$BaseUrl/api/orders" -Data $OrderData -Description "Create Order"

# Test order fetching (assuming clientId = 1)
Test-Endpoint -Method "GET" -Url "$BaseUrl/api/orders/client/1?page=1&limit=10" -Description "Get Orders by Client ID"

# Test with status filter
Test-Endpoint -Method "GET" -Url "$BaseUrl/api/orders/client/1?page=1&limit=10&status=Pending" -Description "Get Orders with Status Filter"

# Test order statistics
Test-Endpoint -Method "GET" -Url "$BaseUrl/api/orders/statistics?clientId=1" -Description "Get Order Statistics"

# 5. Create additional test data
Write-Host "=== ADDITIONAL TEST DATA ===" -ForegroundColor Yellow

$ExpressOrder = @{
    senderName = "Alice Johnson"
    receiverName = "Bob Wilson"
    receiverPhone = "+94771234569"
    pickupAddress = "789 Business Center, Colombo 02"
    destinationAddress = "321 Home Street, Galle"
    clientId = 1
    packageDetails = "3 items, 1.8kg total. Categories: 1x Electronics (0.8kg), 2x Clothing (1.0kg). Priority: express."
    specialInstructions = "Deliver before 5 PM"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$BaseUrl/api/orders" -Data $ExpressOrder -Description "Create Express Order"

$UrgentOrder = @{
    senderName = "Emergency Sender"
    receiverName = "Urgent Receiver"
    receiverPhone = "+94771234570"
    pickupAddress = "Emergency Pickup Location, Colombo 01"
    destinationAddress = "Critical Delivery Point, Negombo"
    clientId = 1
    packageDetails = "1 items, 0.5kg total. Categories: 1x Medical Supplies (0.5kg). Priority: urgent."
    specialInstructions = "URGENT - Medical supplies for hospital"
} | ConvertTo-Json

Test-Endpoint -Method "POST" -Url "$BaseUrl/api/orders" -Data $UrgentOrder -Description "Create Urgent Order"

# Final order list check
Test-Endpoint -Method "GET" -Url "$BaseUrl/api/orders/client/1?page=1&limit=20" -Description "Final Orders List Check"

Write-Host "=== API Testing Complete ===" -ForegroundColor Green
Write-Host "All major API endpoints have been tested with sample data." -ForegroundColor Yellow