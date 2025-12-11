// Debug voice dependencies using official @discordjs/voice helper
import { generateDependencyReport } from '@discordjs/voice';
import crypto from 'node:crypto';

console.log('=== Voice Dependencies Report ===\n');

// Check native aes-256-gcm support
const supportsAesGcm = crypto.getCiphers().includes('aes-256-gcm');
console.log(`Native aes-256-gcm support: ${supportsAesGcm ? '✅ YES' : '❌ NO'}`);

if (!supportsAesGcm) {
    console.log('⚠️  You MUST have at least one encryption library installed!\n');
} else {
    console.log('✅ Native encryption available, but additional libraries can improve compatibility\n');
}

// Generate official dependency report
console.log(generateDependencyReport());

console.log('\n=== Recommendations ===');
console.log('✅ Core Dependencies: Should all be available');
console.log('✅ Opus Libraries: Need at least one (@discordjs/opus recommended)');
console.log('✅ Encryption: Need at least one if aes-256-gcm not supported');
console.log('✅ FFmpeg: Required to play MP3, MP4, and other non-Opus formats');
console.log('ℹ️  DAVE Protocol: Optional, enables end-to-end encryption\n');
