#!/bin/bash

# =============================================================================
# Cloudflare Tunnel Automation Script for React Native App
# =============================================================================
# This script:
# 1. Starts cloudflared tunnel pointing to https://localhost:7133
# 2. Captures the generated tunnel URL
# 3. Automatically updates endpoint.ts with the new URL
# 4. Keeps the tunnel running
# =============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
LOCALHOST_URL="https://localhost:7133"
ENDPOINT_FILE="./src/config/endpoint.ts"
LOG_FILE="./cloudflared-tunnel.log"

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🚀 Cloudflare Tunnel Automation Script${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Check if cloudflared is installed
if ! command -v cloudflared &> /dev/null; then
    echo -e "${RED}❌ Error: cloudflared is not installed${NC}"
    echo -e "${YELLOW}💡 Install it with: brew install cloudflared${NC}"
    exit 1
fi

# Check if endpoint.ts exists
if [ ! -f "$ENDPOINT_FILE" ]; then
    echo -e "${RED}❌ Error: endpoint.ts not found at $ENDPOINT_FILE${NC}"
    echo -e "${YELLOW}💡 Make sure you're running this script from the LetLinkApp directory${NC}"
    exit 1
fi

echo -e "${GREEN}✅ cloudflared is installed${NC}"
echo -e "${GREEN}✅ endpoint.ts found${NC}"
echo ""

# Cleanup function to kill cloudflared on script exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Stopping cloudflared tunnel...${NC}"
    if [ ! -z "$TUNNEL_PID" ]; then
        kill $TUNNEL_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Tunnel stopped${NC}"
    exit 0
}

# Register cleanup function
trap cleanup SIGINT SIGTERM EXIT

echo -e "${BLUE}🔌 Starting cloudflared tunnel...${NC}"
echo -e "${BLUE}   Target: $LOCALHOST_URL${NC}"
echo ""

# Start cloudflared in background and capture output
cloudflared tunnel --url "$LOCALHOST_URL" --no-tls-verify > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

echo -e "${YELLOW}⏳ Waiting for tunnel URL...${NC}"

# Wait for the tunnel URL to appear in the log file (max 30 seconds)
TUNNEL_URL=""
MAX_ATTEMPTS=60
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if [ -f "$LOG_FILE" ]; then
        # Look for the tunnel URL in the log file
        # Cloudflared outputs: https://xxxxx.trycloudflare.com
        TUNNEL_URL=$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' "$LOG_FILE" | head -1)
        
        if [ ! -z "$TUNNEL_URL" ]; then
            break
        fi
    fi
    
    # Check if cloudflared process is still running
    if ! kill -0 $TUNNEL_PID 2>/dev/null; then
        echo -e "${RED}❌ Error: cloudflared process died unexpectedly${NC}"
        echo -e "${YELLOW}📋 Log output:${NC}"
        cat "$LOG_FILE"
        exit 1
    fi
    
    sleep 0.5
    ATTEMPT=$((ATTEMPT + 1))
    
    # Show progress every 5 attempts
    if [ $((ATTEMPT % 10)) -eq 0 ]; then
        echo -e "${YELLOW}   Still waiting... (${ATTEMPT}/2 seconds)${NC}"
    fi
done

if [ -z "$TUNNEL_URL" ]; then
    echo -e "${RED}❌ Error: Could not extract tunnel URL${NC}"
    echo -e "${YELLOW}📋 Log output:${NC}"
    cat "$LOG_FILE"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Tunnel URL captured: $TUNNEL_URL${NC}"
echo ""

# Update endpoint.ts with the new URL
echo -e "${BLUE}📝 Updating endpoint.ts...${NC}"

# Create backup
BACKUP_FILE="${ENDPOINT_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$ENDPOINT_FILE" "$BACKUP_FILE"
echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"

# Update the BasedURL line with the new tunnel URL (keeping /api suffix)
# Using sed with different syntax for macOS
sed -i '' "s|const BasedURL = getEnvVar('EXPO_PUBLIC_API_URL', '[^']*');|const BasedURL = getEnvVar('EXPO_PUBLIC_API_URL', '${TUNNEL_URL}/api');|" "$ENDPOINT_FILE"

# For React Native, use HTTPS (not WSS) for SignalR
# SignalR will negotiate via HTTPS first, then upgrade to WebSocket
# Update the BaseWebSocketUrl line with the new tunnel URL (HTTPS protocol for React Native)
sed -i '' "s|const BaseWebSocketUrl = getEnvVar('EXPO_PUBLIC_WEBSOCKET_URL', '[^']*');|const BaseWebSocketUrl = getEnvVar('EXPO_PUBLIC_WEBSOCKET_URL', '${TUNNEL_URL}');|" "$ENDPOINT_FILE"

echo -e "${GREEN}✅ endpoint.ts updated with new tunnel URLs (HTTP + WebSocket)${NC}"
echo ""

# Display the updated configuration
echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}🎉 Tunnel is ready!${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""
echo -e "${GREEN}📍 API URL:           ${TUNNEL_URL}/api${NC}"
echo -e "${GREEN}🔌 WebSocket URL:     ${TUNNEL_URL} (HTTPS for React Native)${NC}"
echo -e "${GREEN}🔗 Tunnel URL:        ${TUNNEL_URL}${NC}"
echo -e "${GREEN}🎯 Target:            ${LOCALHOST_URL}${NC}"
echo -e "${GREEN}📋 Log File:          ${LOG_FILE}${NC}"
echo -e "${GREEN}💾 Backup:            ${BACKUP_FILE}${NC}"
echo ""
echo -e "${YELLOW}⚠️  Keep this terminal window open to maintain the tunnel${NC}"
echo -e "${YELLOW}⚠️  Press Ctrl+C to stop the tunnel${NC}"
echo ""
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Keep the script running and show live logs
echo -e "${BLUE}📊 Live tunnel logs (Ctrl+C to stop):${NC}"
echo ""

# Follow the log file
tail -f "$LOG_FILE" &
TAIL_PID=$!

# Wait for the tunnel process to exit
wait $TUNNEL_PID

# Cleanup tail process
kill $TAIL_PID 2>/dev/null || true

