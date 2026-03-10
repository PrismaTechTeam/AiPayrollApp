#!/bin/bash

# =============================================================================
# Stop Cloudflare Tunnel Script
# =============================================================================
# This script stops any running cloudflared tunnels
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}🛑 Stopping Cloudflare Tunnel${NC}"
echo -e "${BLUE}==============================================================================${NC}"
echo ""

# Find and kill all cloudflared processes
PIDS=$(pgrep -f "cloudflared tunnel")

if [ -z "$PIDS" ]; then
    echo -e "${YELLOW}⚠️  No running cloudflared tunnels found${NC}"
else
    echo -e "${GREEN}Found running tunnel(s), stopping...${NC}"
    echo "$PIDS" | xargs kill 2>/dev/null
    sleep 1
    
    # Force kill if still running
    REMAINING=$(pgrep -f "cloudflared tunnel")
    if [ ! -z "$REMAINING" ]; then
        echo -e "${YELLOW}⚠️  Force killing remaining processes...${NC}"
        echo "$REMAINING" | xargs kill -9 2>/dev/null
    fi
    
    echo -e "${GREEN}✅ All tunnels stopped${NC}"
fi

echo ""

