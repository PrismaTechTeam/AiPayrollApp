/**
 * JWT Token Verification Script
 * Run with: node verify-jwt.js
 */

const crypto = require('crypto');

// Your JWT token from the logs
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJVaWQiOiJmMGRmYmI0Ni0zNDExLTQyZjYtYTg1Yi1jNmJhOWVmZDczN2MiLCJUZW5hbnRJZCI6IiIsImh0dHA6Ly9zY2hlbWFzLnhtbHNvYXAub3JnL3dzLzIwMDUvMDUvaWRlbnRpdHkvY2xhaW1zL2VtYWlsYWRkcmVzcyI6Iis2MDY0MzQ2MTY2MTYxQHBob25lLmxvY2FsIiwiaXNFbWFpbENvbmZpcm1lZCI6IkZhbHNlIiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbW9iaWxlcGhvbmUiOiIrNjA2NDM0NjE2NjE2MSIsImlzUGhvbmVOdW1iZXJDb25maXJtZWQiOiJUcnVlIiwiSXNOZXdVc2VyIjoiVHJ1ZSIsInJvbGUiOiJVc2VyIiwiQWN0aXZlUm9sZSI6IlVzZXIiLCJleHAiOjE3OTM0OTU5MDN9.6IjRohD-z79n3h1w5vahdH-h0jxt1XVgHA12vfWVrYI';

// JWT secret from appsettings.json
const secret = 'AS0D9I09I00ID209ID0I230I0ASDAVMFBVFGH302JH923ME2NC2903JF020M2N3SVD3AMZX';

// Split token into parts
const [headerB64, payloadB64, signatureB64] = token.split('.');

// Decode payload
const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());

console.log('\n🔐 JWT TOKEN VERIFICATION\n');
console.log('=' .repeat(80));

// Decode and display payload
console.log('\n📋 Token Payload:');
console.log(JSON.stringify(payload, null, 2));

// Check expiration
const now = Math.floor(Date.now() / 1000);
const expiresAt = payload.exp;
const isExpired = now > expiresAt;

console.log('\n⏰ Expiration Check:');
console.log('  Current time:', now, `(${new Date(now * 1000).toISOString()})`);
console.log('  Expires at:  ', expiresAt, `(${new Date(expiresAt * 1000).toISOString()})`);
console.log('  Time left:   ', (expiresAt - now), 'seconds');
console.log('  Status:      ', isExpired ? '❌ EXPIRED' : '✅ VALID');

// Verify signature
console.log('\n🔏 Signature Verification:');

const data = `${headerB64}.${payloadB64}`;
const signature = crypto
  .createHmac('sha256', secret)
  .update(data)
  .digest('base64url');

const isValid = signature === signatureB64;

console.log('  Expected signature:', signature);
console.log('  Actual signature:  ', signatureB64);
console.log('  Match:             ', isValid ? '✅ VALID' : '❌ INVALID');

// Overall result
console.log('\n' + '='.repeat(80));
console.log('\n🎯 RESULT:', (isValid && !isExpired) ? '✅ TOKEN IS VALID' : '❌ TOKEN IS INVALID');
console.log('\n');

if (!isValid) {
  console.log('⚠️  The signature does not match!');
  console.log('   This means the token was signed with a different secret.');
  console.log('   Check that the backend JWT secret matches the one used during login.\n');
}

if (isExpired) {
  console.log('⚠️  The token has expired!');
  console.log('   The user needs to login again to get a fresh token.\n');
}

