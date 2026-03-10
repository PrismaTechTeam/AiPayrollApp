#!/bin/bash

# ========================================
# LetLink Mobile - Security Verification Script
# ========================================

echo "🔐 Verifying Android Security Configuration..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check 1: Hermes Enabled
echo "1️⃣  Checking Hermes Engine..."
if grep -q "hermesEnabled=true" android/gradle.properties; then
    echo -e "${GREEN}✅ Hermes Engine is ENABLED${NC}"
else
    echo -e "${RED}❌ Hermes Engine is DISABLED${NC}"
fi
echo ""

# Check 2: R8/ProGuard Enabled
echo "2️⃣  Checking R8/ProGuard Obfuscation..."
if grep -q "android.enableMinifyInReleaseBuilds=true" android/gradle.properties; then
    echo -e "${GREEN}✅ R8/ProGuard is ENABLED${NC}"
else
    echo -e "${RED}❌ R8/ProGuard is DISABLED${NC}"
fi
echo ""

# Check 3: Resource Shrinking
echo "3️⃣  Checking Resource Shrinking..."
if grep -q "android.enableShrinkResourcesInReleaseBuilds=true" android/gradle.properties; then
    echo -e "${GREEN}✅ Resource Shrinking is ENABLED${NC}"
else
    echo -e "${YELLOW}⚠️  Resource Shrinking is DISABLED${NC}"
fi
echo ""

# Check 4: ProGuard Optimize
echo "4️⃣  Checking ProGuard Optimization Level..."
if grep -q "proguard-android-optimize.txt" android/app/build.gradle; then
    echo -e "${GREEN}✅ Using optimized ProGuard configuration${NC}"
else
    echo -e "${YELLOW}⚠️  Using standard ProGuard configuration${NC}"
fi
echo ""

# Check 5: ProGuard Rules
echo "5️⃣  Checking ProGuard Rules..."
if [ -f "android/app/proguard-rules.pro" ]; then
    rule_count=$(grep -c "^-" android/app/proguard-rules.pro)
    if [ $rule_count -gt 10 ]; then
        echo -e "${GREEN}✅ ProGuard rules configured ($rule_count rules)${NC}"
    else
        echo -e "${YELLOW}⚠️  ProGuard rules exist but may be incomplete ($rule_count rules)${NC}"
    fi
else
    echo -e "${RED}❌ ProGuard rules file not found${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo "📊 Security Configuration Summary"
echo "=========================================="
echo ""
echo "Protection Layer          | Status"
echo "--------------------------|--------"

# Hermes
if grep -q "hermesEnabled=true" android/gradle.properties; then
    echo -e "Hermes Bytecode          | ${GREEN}✅ Active${NC}"
else
    echo -e "Hermes Bytecode          | ${RED}❌ Inactive${NC}"
fi

# R8
if grep -q "android.enableMinifyInReleaseBuilds=true" android/gradle.properties; then
    echo -e "R8 Obfuscation           | ${GREEN}✅ Active${NC}"
else
    echo -e "R8 Obfuscation           | ${RED}❌ Inactive${NC}"
fi

# Resource Shrinking
if grep -q "android.enableShrinkResourcesInReleaseBuilds=true" android/gradle.properties; then
    echo -e "Resource Shrinking       | ${GREEN}✅ Active${NC}"
else
    echo -e "Resource Shrinking       | ${RED}❌ Inactive${NC}"
fi

echo ""
echo "=========================================="
echo "🚀 Next Steps:"
echo "=========================================="
echo ""
echo "1. Test a release build:"
echo "   cd android && ./gradlew assembleRelease"
echo ""
echo "2. Check for obfuscation:"
echo "   Look for 'minifyReleaseWithR8' in build output"
echo ""
echo "3. Verify APK size is smaller"
echo ""
echo "4. Test app functionality in release mode"
echo ""
echo "=========================================="


