/**
 * Music Configuration
 * This file handles all music-related configuration
 * Loads from environment variables
 * Note: Spotify credentials are configured in NodeLink's application.yml
 */

// Parse NodeLink nodes from environment
function parseNodes() {
    return [
        {
            host: process.env.NODELINK_HOST || 'localhost',
            port: parseInt(process.env.NODELINK_PORT) || 2333,
            password: process.env.NODELINK_PASSWORD || 'youshallnotpass',
            secure: process.env.NODELINK_SECURE === 'true'
        }
    ];
}

export default {
    // NodeLink nodes configuration
    nodes: parseNodes(),

    // Default search platform: ytsearch, ytmsearch, scsearch, spsearch
    defaultSearchPlatform: process.env.MUSIC_SEARCH_PLATFORM || 'ytmsearch',

    // Riffy REST version
    restVersion: 'v4',

    // Auto leave settings
    autoLeave: {
        enabled: true,
        timeout: 300000 // 5 minutes in milliseconds
    },

    // Default volume (0-100)
    defaultVolume: 80
};
