// Test libsodium-wrappers compatibility with discord-voip
import libsodium from 'libsodium-wrappers';

await libsodium.ready;

console.log('=== libsodium-wrappers Methods Test ===\n');

// Check for methods that discord-voip needs for encryption modes
const requiredMethods = {
    'aead_xchacha20poly1305_rtpsize': [
        'crypto_aead_xchacha20poly1305_ietf_encrypt',
        'crypto_aead_xchacha20poly1305_ietf_decrypt',
        'crypto_aead_xchacha20poly1305_ietf_KEYBYTES',
        'crypto_aead_xchacha20poly1305_ietf_NPUBBYTES',
        'crypto_aead_xchacha20poly1305_ietf_ABYTES'
    ],
    'basic_secretbox': [
        'crypto_secretbox_easy',
        'crypto_secretbox_open_easy',
        'crypto_secretbox_KEYBYTES',
        'crypto_secretbox_NONCEBYTES'
    ]
};

for (const [mode, methods] of Object.entries(requiredMethods)) {
    console.log(`${mode}:`);
    for (const method of methods) {
        const exists = typeof libsodium[method] !== 'undefined';
        console.log(`  ${exists ? '✅' : '❌'} ${method}: ${typeof libsodium[method]}`);
    }
    console.log();
}

console.log('Sample crypto methods available:');
const cryptoMethods = Object.keys(libsodium).filter(k => k.startsWith('crypto_'));
console.log(`Total: ${cryptoMethods.length}`);
console.log('First 10:', cryptoMethods.slice(0, 10).join(', '));
