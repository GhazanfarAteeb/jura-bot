/**
 * Discord Player configuration optimized for accurate Spotify → YouTube matching
 * This mimics Jockie Music's approach for better search accuracy
 */

export const playerConfig = {
    // YT-DLP options for best quality
    ytdlOptions: {
        quality: 'highestaudio',
        highWaterMark: 1 << 25,
        filter: 'audioonly',
        dlChunkSize: 0,
        // Request format preferences (prefer Topic channels)
        requestOptions: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }
    },
    
    // Connection settings
    connectionTimeout: 30000,
    skipFFmpeg: false,
    useLegacyFFmpeg: false,
    
    // Queue configuration
    leaveOnEnd: false,
    leaveOnStop: false,
    leaveOnEmpty: true,
    leaveOnEmptyCooldown: 300000,
    selfDeaf: true,
    bufferingTimeout: 3000
};

/**
 * Improve search query for Spotify tracks (Jockie Music approach)
 * Cleans up title and prioritizes Topic channels
 */
export function improveSpotifyQuery(title, artist) {
    // Remove common parenthetical content
    const cleanTitle = title
        .replace(/\s*\(feat\.?.*?\)/gi, '')
        .replace(/\s*\[.*?\]/g, '')
        .replace(/\s*\(official.*?\)/gi, '')
        .replace(/\s*-\s*remaster.*$/gi, '')
        .trim();
    
    // Take primary artist only
    const cleanArtist = artist
        .split(',')[0]
        .split('&')[0]
        .split('feat')[0]
        .split('ft.')[0]
        .trim();
    
    // Construct query that prefers Topic channels (auto-generated, most accurate)
    return `${cleanArtist} ${cleanTitle} topic`;
}

/**
 * Check if a YouTube result is likely the correct match
 */
export function isGoodMatch(ytResult, spotifyTrack) {
    // Prefer results from Topic channels (most reliable)
    if (ytResult.channel?.includes('- Topic')) {
        return true;
    }
    
    // Check duration match (within 5 seconds)
    const durationDiff = Math.abs(ytResult.durationMS - spotifyTrack.durationMS);
    if (durationDiff > 5000) {
        return false; // Duration mismatch, probably wrong version
    }
    
    // Prefer "Official" in title
    if (ytResult.title.toLowerCase().includes('official')) {
        return true;
    }
    
    // Avoid live/cover versions
    const badKeywords = ['live', 'cover', 'karaoke', 'instrumental', 'acoustic', 'remix'];
    const hasBadKeyword = badKeywords.some(keyword => 
        ytResult.title.toLowerCase().includes(keyword) &&
        !spotifyTrack.title.toLowerCase().includes(keyword)
    );
    
    return !hasBadKeyword;
}
