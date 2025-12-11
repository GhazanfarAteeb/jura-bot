import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

class Logger {
    constructor() {
        this.logsDir = logsDir;
    }

    getTimestamp() {
        return new Date().toISOString();
    }

    getDateString() {
        return new Date().toISOString().split('T')[0];
    }

    formatMessage(level, message, data = null) {
        const timestamp = this.getTimestamp();
        let logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (data) {
            if (data instanceof Error) {
                logMessage += `\nError: ${data.message}\nStack: ${data.stack}`;
            } else if (typeof data === 'object') {
                logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
            } else {
                logMessage += `\nData: ${data}`;
            }
        }
        
        return logMessage;
    }

    writeToFile(filename, message) {
        const filePath = path.join(this.logsDir, filename);
        const logMessage = message + '\n';
        
        try {
            fs.appendFileSync(filePath, logMessage, 'utf8');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    // General logging
    info(message, data = null) {
        const logMessage = this.formatMessage('INFO', message, data);
        console.log(logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    warn(message, data = null) {
        const logMessage = this.formatMessage('WARN', message, data);
        console.warn(logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    error(message, data = null) {
        const logMessage = this.formatMessage('ERROR', message, data);
        console.error(logMessage);
        this.writeToFile(`error-${this.getDateString()}.log`, logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    debug(message, data = null) {
        if (process.env.NODE_ENV === 'development') {
            const logMessage = this.formatMessage('DEBUG', message, data);
            console.debug(logMessage);
            this.writeToFile(`debug-${this.getDateString()}.log`, logMessage);
        }
    }

    // Deployment logging
    deployment(message, data = null) {
        const logMessage = this.formatMessage('DEPLOY', message, data);
        console.log(logMessage);
        this.writeToFile(`deployment-${this.getDateString()}.log`, logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    // Build logging
    build(message, data = null) {
        const logMessage = this.formatMessage('BUILD', message, data);
        console.log(logMessage);
        this.writeToFile(`build-${this.getDateString()}.log`, logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    // Command execution logging
    command(commandName, user, guild, success = true, error = null) {
        const data = {
            command: commandName,
            user: `${user.tag} (${user.id})`,
            guild: guild ? `${guild.name} (${guild.id})` : 'DM',
            success,
            error: error ? error.message : null
        };
        
        const logMessage = this.formatMessage('COMMAND', `Command executed: ${commandName}`, data);
        console.log(logMessage);
        this.writeToFile(`commands-${this.getDateString()}.log`, logMessage);
    }

    // Event logging
    event(eventName, data = null) {
        const logMessage = this.formatMessage('EVENT', `Event triggered: ${eventName}`, data);
        console.log(logMessage);
        this.writeToFile(`events-${this.getDateString()}.log`, logMessage);
    }

    // Database logging
    database(operation, success = true, error = null) {
        const data = { operation, success, error: error ? error.message : null };
        const logMessage = this.formatMessage('DATABASE', `Database operation: ${operation}`, data);
        
        if (!success) {
            console.error(logMessage);
            this.writeToFile(`error-${this.getDateString()}.log`, logMessage);
        } else {
            console.log(logMessage);
        }
        
        this.writeToFile(`database-${this.getDateString()}.log`, logMessage);
    }

    // Performance logging
    performance(operation, duration, data = null) {
        const perfData = { operation, duration: `${duration}ms`, ...data };
        const logMessage = this.formatMessage('PERFORMANCE', `Operation completed in ${duration}ms`, perfData);
        console.log(logMessage);
        this.writeToFile(`performance-${this.getDateString()}.log`, logMessage);
    }

    // System startup
    startup(message, data = null) {
        const logMessage = this.formatMessage('STARTUP', message, data);
        console.log(logMessage);
        this.writeToFile(`startup-${this.getDateString()}.log`, logMessage);
        this.writeToFile(`app-${this.getDateString()}.log`, logMessage);
    }

    // Clean old logs (older than specified days)
    cleanOldLogs(daysToKeep = 30) {
        try {
            const files = fs.readdirSync(this.logsDir);
            const now = Date.now();
            const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

            files.forEach(file => {
                const filePath = path.join(this.logsDir, file);
                const stats = fs.statSync(filePath);
                
                if (now - stats.mtimeMs > maxAge) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted old log file: ${file}`);
                }
            });
        } catch (error) {
            console.error('Error cleaning old logs:', error);
        }
    }

    // Get log statistics
    getStats() {
        try {
            const files = fs.readdirSync(this.logsDir);
            const stats = {
                totalFiles: files.length,
                totalSize: 0,
                filesByType: {}
            };

            files.forEach(file => {
                const filePath = path.join(this.logsDir, file);
                const fileStats = fs.statSync(filePath);
                stats.totalSize += fileStats.size;

                const type = file.split('-')[0];
                if (!stats.filesByType[type]) {
                    stats.filesByType[type] = { count: 0, size: 0 };
                }
                stats.filesByType[type].count++;
                stats.filesByType[type].size += fileStats.size;
            });

            stats.totalSize = (stats.totalSize / (1024 * 1024)).toFixed(2) + ' MB';
            
            return stats;
        } catch (error) {
            console.error('Error getting log stats:', error);
            return null;
        }
    }
}

// Export singleton instance
const logger = new Logger();
export default logger;
