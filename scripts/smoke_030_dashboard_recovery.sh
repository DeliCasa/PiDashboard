#!/bin/bash
# Smoke Test Script for Feature 030: Dashboard Recovery
# Verifies API endpoints return JSON (not HTML fallback)
# 
# Usage: ./scripts/smoke_030_dashboard_recovery.sh [BASE_URL]
# Default BASE_URL: http://localhost:8082

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${1:-http://localhost:8082}"
PASS_COUNT=0
FAIL_COUNT=0

echo "========================================"
echo " 030 Dashboard Recovery - Smoke Test"
echo "========================================"
echo "Base URL: $BASE_URL"
echo ""

# Function to test endpoint
test_endpoint() {
    local endpoint="$1"
    local description="$2"
    local full_url="${BASE_URL}${endpoint}"
    
    printf "Testing %-40s " "${endpoint}..."
    
    # Make request and capture response headers and body
    local response
    local http_code
    local content_type
    
    # Use curl with separate header and body output
    response=$(curl -s -w "\n%{http_code}\n%{content_type}" "$full_url" 2>/dev/null) || {
        echo -e "${RED}FAIL${NC} (connection error)"
        ((FAIL_COUNT++))
        return 1
    }
    
    # Parse response - last two lines are status code and content type
    http_code=$(echo "$response" | tail -2 | head -1)
    content_type=$(echo "$response" | tail -1)
    
    # Check for JSON content type
    if [[ "$content_type" == *"application/json"* ]]; then
        echo -e "${GREEN}PASS${NC} (${http_code}, JSON)"
        ((++PASS_COUNT)) || true
        return 0
    elif [[ "$content_type" == *"text/html"* ]]; then
        echo -e "${RED}FAIL${NC} (${http_code}, HTML - SPA fallback!)"
        ((++FAIL_COUNT)) || true
        return 1
    else
        echo -e "${YELLOW}WARN${NC} (${http_code}, ${content_type:-unknown})"
        ((++PASS_COUNT)) || true
        return 0
    fi
}

# Run tests
echo "API Endpoint Tests:"
echo "-------------------"

# Core API endpoints (required)
test_endpoint "/api/devices" "Device list"
test_endpoint "/api/wifi/status" "WiFi status"
test_endpoint "/api/wifi/scan" "WiFi scan (GET)"
test_endpoint "/api/system/info" "System info"

# V1 API endpoints (required for provisioning)
test_endpoint "/api/v1/provisioning/allowlist" "V1 Allowlist"

# Dashboard endpoints (optional - may not exist on all deployments)
echo ""
echo "Optional Dashboard Endpoints:"
echo "-----------------------------"
test_endpoint "/api/dashboard/cameras" "Dashboard cameras" || true
test_endpoint "/api/door/status" "Door status" || true
test_endpoint "/api/dashboard/bridge/status" "Bridge status" || true

echo ""
echo "========================================"
echo " Summary"
echo "========================================"
echo -e "Passed: ${GREEN}${PASS_COUNT}${NC}"
echo -e "Failed: ${RED}${FAIL_COUNT}${NC}"
echo ""

if [[ $FAIL_COUNT -eq 0 ]]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed. Check endpoints returning HTML (SPA fallback).${NC}"
    exit 1
fi
