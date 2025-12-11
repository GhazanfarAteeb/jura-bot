// Test encryption support on the server
import crypto from 'node:crypto';

console.log('=== Encryption Support Test ===\n');

// Check if aes-256-gcm is supported
const supportsAesGcm = crypto.getCiphers().includes('aes-256-gcm');
console.log('✓ aes-256-gcm supported:', supportsAesGcm);

if (supportsAesGcm) {
    console.log('\n✅ Your system supports aes-256-gcm natively!');
    console.log('ℹ️  You may not need additional encryption libraries.');
} else {
    console.log('\n⚠️  Your system does NOT support aes-256-gcm!');
    console.log('ℹ️  You MUST install one of these encryption libraries:');
    console.log('   - libsodium-wrappers (recommended, pure JS)');
    console.log('   - @stablelib/xchacha20poly1305');
    console.log('   - @noble/ciphers');
    console.log('   - tweetnacl');
}

// Test available encryption libraries
console.log('\n=== Testing Available Libraries ===\n');

// Test libsodium-wrappers
try {
    const libsodium = await import('libsodium-wrappers');
    await libsodium.ready;
    console.log('✅ libsodium-wrappers: AVAILABLE');
} catch (err) {
    console.log('❌ libsodium-wrappers: NOT AVAILABLE');
}

// Test tweetnacl
try {
    await import('tweetnacl');
    console.log('✅ tweetnacl: AVAILABLE');
} catch (err) {
    console.log('❌ tweetnacl: NOT AVAILABLE');
}

// Test @stablelib/xchacha20poly1305
try {
    await import('@stablelib/xchacha20poly1305');
    console.log('✅ @stablelib/xchacha20poly1305: AVAILABLE');
} catch (err) {
    console.log('❌ @stablelib/xchacha20poly1305: NOT AVAILABLE');
}

// Test @noble/ciphers
try {
    const noble = await import('@noble/ciphers');
    console.log('✅ @noble/ciphers: AVAILABLE');
    console.log('   Exports:', Object.keys(noble).join(', '));
} catch (err) {
    console.log('❌ @noble/ciphers: NOT AVAILABLE');
    console.log('   Error:', err.message);
}

console.log('\n=== Test Complete ===');
