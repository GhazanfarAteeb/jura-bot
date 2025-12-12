import ytdl from '@distube/ytdl-core';
import ytsearch from 'yt-search';

/**
 * Search YouTube for videos
 * @param {string} query - Search query
 * @param {number} limit - Max results
 * @returns {Promise<Array>} Array of video results
 */
export async function searchYouTube(query, limit = 5) {
    try {
        const results = await ytsearch(query);
        
        if (!results || !results.videos || results.videos.length === 0) {
            return [];
        }
        
        return results.videos.slice(0, limit).map(video => ({
            title: video.title,
            url: video.url,
            duration: video.duration.toString(),
            durationSeconds: video.seconds,
            author: video.author.name,
            thumbnail: video.thumbnail,
            views: video.views,
            ago: video.ago
        }));
    } catch (error) {
        console.error('YouTube search error:', error.message);
        return [];
    }
}

/**
 * Get video info from YouTube URL
 * @param {string} url - YouTube video URL
 * @returns {Promise<Object|null>} Video info or null
 */
export async function getVideoInfo(url) {
    try {
        const info = await ytdl.getInfo(url);
        const format = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
        
        return {
            title: info.videoDetails.title,
            url: info.videoDetails.video_url,
            duration: formatDuration(parseInt(info.videoDetails.lengthSeconds)),
            durationSeconds: parseInt(info.videoDetails.lengthSeconds),
            author: info.videoDetails.author.name,
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
            streamUrl: format.url
        };
    } catch (error) {
        console.error('YouTube video info error:', error.message);
        return null;
    }
}

/**
 * Validate if URL is a YouTube URL
 * @param {string} url - URL to check
 * @returns {boolean} True if valid YouTube URL
 */
export function isYouTubeURL(url) {
    return ytdl.validateURL(url);
}

/**
 * Extract video ID from YouTube URL
 * @param {string} url - YouTube URL
 * @returns {string|null} Video ID or null
 */
export function extractVideoID(url) {
    try {
        return ytdl.getVideoID(url);
    } catch {
        return null;
    }
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}
