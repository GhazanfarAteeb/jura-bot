import play from 'play-dl';
import logger from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class SpotifyTokenManager {
  constructor() {
    this.refreshInterval = null;
    this.isInitialized = false;
    this.refreshIntervalMs = 30 * 60 * 1000; // 30 minutes
  }

  ensureDataDirectory() {
    const dataDir = path.join(__dirname, '../../.data');
    
    try {
      if (!fs.existsSync(dataDir)) {
        logger.info('Creating .data directory for Spotify credentials...');
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
      }
      
      // Check if we have write permissions
      fs.accessSync(dataDir, fs.constants.W_OK);
      return true;
    } catch (error) {
      if (error.code === 'EACCES') {
        logger.error('❌ Permission denied: Cannot access .data directory');
        logger.error('Please ensure the .data directory has write permissions');
        logger.error(`Directory: ${dataDir}`);
        
        // Try to fix permissions based on platform
        if (process.platform === 'win32') {
          logger.info('Attempting to fix permissions on Windows...');
          try {
            const { execSync } = require('child_process');
            execSync(`icacls "${dataDir}" /grant Users:F /T`, { stdio: 'ignore' });
            logger.info('✅ Permissions updated successfully');
            return true;
          } catch (fixError) {
            logger.error('Failed to fix permissions automatically');
            logger.warn('Please run as administrator or manually fix permissions');
          }
        } else {
          // Linux/Unix fix
          logger.info('Attempting to fix permissions on Linux...');
          logger.warn('Run this command to fix permissions:');
          logger.warn(`  sudo chmod -R 755 ${dataDir}`);
          logger.warn(`  sudo chown -R $USER:$USER ${dataDir}`);
          
          // Try to fix without sudo (might work if user owns parent dir)
          try {
            fs.chmodSync(dataDir, 0o755);
            logger.info('✅ Permissions updated successfully');
            return true;
          } catch (fixError) {
            logger.error('Failed to fix permissions automatically (run the commands above)');
          }
        }
      } else {
        logger.error('Error checking .data directory:', error);
      }
      return false;
    }
  }

  async initialize() {
    try {
      logger.info('🎵 Initializing Spotify token manager...');

      // Ensure .data directory exists and is writable
      if (!this.ensureDataDirectory()) {
        logger.warn('⚠️ Skipping Spotify token initialization due to permission issues');
        logger.warn('Spotify features may not work until permissions are fixed');
        return;
      }

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
      if (error.code === 'EACCES') {
        logger.error('❌ Permission denied accessing Spotify credentials');
        logger.error('Please check .data directory permissions');
      } else {
        logger.error('❌ Failed to initialize Spotify token', error);
      }
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
        if (error.code === 'EACCES') {
          logger.error('❌ Permission denied accessing Spotify credentials during refresh');
          logger.warn('Stopping auto-refresh until permissions are fixed');
          this.stop();
        } else {
          logger.error('❌ Failed to refresh Spotify token', error);
          logger.warn('Spotify playback may be affected');
        }
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
      if (error.code === 'EACCES') {
        logger.error('Permission denied: Cannot validate Spotify token');
        return false;
      }
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
