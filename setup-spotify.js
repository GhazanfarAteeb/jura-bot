import play from 'play-dl';

console.log('🎵 Spotify Authorization Setup for play-dl\n');
console.log('This script will help you authorize Spotify with play-dl.');
console.log('Make sure you have created a Spotify App at: https://developer.spotify.com/dashboard/\n');

async function setup() {
    try {
        await play.authorization();
        console.log('\n✅ Authorization successful!');
        console.log('Credentials have been saved to the .data folder.');
        console.log('You can now use Spotify features in your bot.');
    } catch (error) {
        console.error('❌ Authorization failed:', error.message);
        console.log('\nMake sure you:');
        console.log('1. Created a Spotify App at https://developer.spotify.com/dashboard/');
        console.log('2. Have your Client ID and Client Secret ready');
        console.log('3. Added a Redirect URI in your Spotify App settings');
    }
}

setup();
