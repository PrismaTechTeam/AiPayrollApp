# ========================================
# LetLink Mobile - Security Verification Script (PowerShell)
# ========================================

Write-Host ""
Write-Host "🔐 Verifying Android Security Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check 1: Hermes Enabled
Write-Host "1️⃣  Checking Hermes Engine..."
$hermesEnabled = Select-String -Path "android\gradle.properties" -Pattern "hermesEnabled=true" -Quiet
if ($hermesEnabled) {
    Write-Host "✅ Hermes Engine is ENABLED" -ForegroundColor Green
} else {
    Write-Host "❌ Hermes Engine is DISABLED" -ForegroundColor Red
}
Write-Host ""

# Check 2: R8/ProGuard Enabled
Write-Host "2️⃣  Checking R8/ProGuard Obfuscation..."
$r8Enabled = Select-String -Path "android\gradle.properties" -Pattern "android.enableMinifyInReleaseBuilds=true" -Quiet
if ($r8Enabled) {
    Write-Host "✅ R8/ProGuard is ENABLED" -ForegroundColor Green
} else {
    Write-Host "❌ R8/ProGuard is DISABLED" -ForegroundColor Red
}
Write-Host ""

# Check 3: Resource Shrinking
Write-Host "3️⃣  Checking Resource Shrinking..."
$shrinkEnabled = Select-String -Path "android\gradle.properties" -Pattern "android.enableShrinkResourcesInReleaseBuilds=true" -Quiet
if ($shrinkEnabled) {
    Write-Host "✅ Resource Shrinking is ENABLED" -ForegroundColor Green
} else {
    Write-Host "⚠️  Resource Shrinking is DISABLED" -ForegroundColor Yellow
}
Write-Host ""

# Check 4: ProGuard Optimize
Write-Host "4️⃣  Checking ProGuard Optimization Level..."
$optimizeEnabled = Select-String -Path "android\app\build.gradle" -Pattern "proguard-android-optimize.txt" -Quiet
if ($optimizeEnabled) {
    Write-Host "✅ Using optimized ProGuard configuration" -ForegroundColor Green
} else {
    Write-Host "⚠️  Using standard ProGuard configuration" -ForegroundColor Yellow
}
Write-Host ""

# Check 5: ProGuard Rules
Write-Host "5️⃣  Checking ProGuard Rules..."
if (Test-Path "android\app\proguard-rules.pro") {
    $ruleCount = (Select-String -Path "android\app\proguard-rules.pro" -Pattern "^-" | Measure-Object).Count
    if ($ruleCount -gt 10) {
        Write-Host "✅ ProGuard rules configured ($ruleCount rules)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  ProGuard rules exist but may be incomplete ($ruleCount rules)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ ProGuard rules file not found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "📊 Security Configuration Summary" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

$table = @()
if ($hermesEnabled) {
    $table += [PSCustomObject]@{ Layer = "Hermes Bytecode"; Status = "✅ Active" }
} else {
    $table += [PSCustomObject]@{ Layer = "Hermes Bytecode"; Status = "❌ Inactive" }
}

if ($r8Enabled) {
    $table += [PSCustomObject]@{ Layer = "R8 Obfuscation"; Status = "✅ Active" }
} else {
    $table += [PSCustomObject]@{ Layer = "R8 Obfuscation"; Status = "❌ Inactive" }
}

if ($shrinkEnabled) {
    $table += [PSCustomObject]@{ Layer = "Resource Shrinking"; Status = "✅ Active" }
} else {
    $table += [PSCustomObject]@{ Layer = "Resource Shrinking"; Status = "❌ Inactive" }
}

$table | Format-Table -AutoSize

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Test a release build:" -ForegroundColor White
Write-Host "   cd android" -ForegroundColor Gray
Write-Host "   .\gradlew assembleRelease" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check for obfuscation:" -ForegroundColor White
Write-Host "   Look for 'minifyReleaseWithR8' in build output" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Verify APK size is smaller" -ForegroundColor White
Write-Host ""
Write-Host "4. Test app functionality in release mode" -ForegroundColor White
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""


