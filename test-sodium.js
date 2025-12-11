// Test script to verify sodium libraries are working
console.log('Testing encryption libraries...\n');

async function testLibraries() {
    // Test sodium-native
    try {
        const sodium = await import('sodium-native');
        console.log('✅ sodium-native: AVAILABLE');
        console.log('   crypto_secretbox_KEYBYTES:', sodium.crypto_secretbox_KEYBYTES);
    } catch (err) {
        console.log('❌ sodium-native: NOT AVAILABLE');
    }

    // Test libsodium-wrappers
    try {
        const libsodium = await import('libsodium-wrappers');
        await libsodium.ready;
        console.log('✅ libsodium-wrappers: AVAILABLE');
        console.log('   crypto_secretbox_KEYBYTES:', libsodium.crypto_secretbox_KEYBYTES);
    } catch (err) {
        console.log('❌ libsodium-wrappers: NOT AVAILABLE');
    }

    // Test tweetnacl
    try {
        const tweetnacl = await import('tweetnacl');
        console.log('✅ tweetnacl: AVAILABLE');
        console.log('   secretbox.keyLength:', tweetnacl.default.secretbox.keyLength);
    } catch (err) {
        console.log('❌ tweetnacl: NOT AVAILABLE');
    }

    // Test @discordjs/voice
    try {
        const voice = await import('@discordjs/voice');
        console.log('\n✅ @discordjs/voice: AVAILABLE');
        console.log('   Version info available');
    } catch (err) {
        console.log('\n❌ @discordjs/voice: NOT AVAILABLE');
        console.log('   Error:', err.message);
    }
}

testLibraries();
