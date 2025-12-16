import play from 'play-dl';
import logger from './logger.js';

class SpotifyTokenManager {
  constructor() {
    this.refreshInterval = null;
    this.isInitialized = false;
    this.refreshIntervalMs = 30 * 60 * 1000; // 30 minutes
  }

  async initialize() {
    try {
      logger.info('🎵 Initializing Spotify token manager...');

      // Initial token check/refresh
      const isValid = await play.refreshToken();

      if (isValid) {
        this.isInitialized = true;
        logger.info('✅ Spotify token initialized successfully');

        // Start auto-refresh
        this.startAutoRefresh();
      } else {
        logger.warn('⚠️ Spotify token refresh failed - may need re-authorization');
        logger.warn('Run "npm run setup:spotify" to authorize');
      }
    } catch (error) {
      logger.error('❌ Failed to initialize Spotify token', error);
      logger.warn('Spotify features may not work. Run "npm run setup:spotify" to authorize');
    }
  }

  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    logger.info(`🔄 Starting Spotify token auto-refresh (every ${this.refreshIntervalMs / 60000} minutes)`);

    this.refreshInterval = setInterval(async () => {
      try {
        const isValid = await play.refreshToken();

        if (isValid) {
          logger.info('✅ Spotify token refreshed successfully');
        } else {
          logger.warn('⚠️ Spotify token refresh returned invalid - may need re-authorization');
        }
      } catch (error) {
        logger.error('❌ Failed to refresh Spotify token', error);
        logger.warn('Spotify playback may be affected');
      }
    }, this.refreshIntervalMs);
  }

  async ensureTokenValid() {
    try {
      const isValid = await play.refreshToken();
      if (!isValid) {
        logger.warn('Spotify token validation failed');
      }
      return isValid;
    } catch (error) {
      logger.error('Error validating Spotify token', error);
      return false;
    }
  }

  stop() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      logger.info('🛑 Spotify token auto-refresh stopped');
    }
  }

  getStatus() {
    return {
      initialized: this.isInitialized,
      autoRefreshActive: this.refreshInterval !== null,
      refreshInterval: this.refreshIntervalMs
    };
  }
}

export default new SpotifyTokenManager();
