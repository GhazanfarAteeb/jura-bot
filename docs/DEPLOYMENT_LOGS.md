# Deployment & Build Logs

The bot now includes comprehensive logging for all operations, including deployment and build tracking.

## Log System

### Log Files Location
All logs are stored in the `logs/` directory with the format: `{type}-{date}.log`

### Log Types

| Type | File Pattern | Description |
|------|-------------|-------------|
| **app** | `app-YYYY-MM-DD.log` | General application logs (all activity) |
| **error** | `error-YYYY-MM-DD.log` | Error logs only |
| **command** | `commands-YYYY-MM-DD.log` | Command execution tracking |
| **event** | `events-YYYY-MM-DD.log` | Discord event logs |
| **database** | `database-YYYY-MM-DD.log` | Database operations |
| **performance** | `performance-YYYY-MM-DD.log` | Performance metrics |
| **deployment** | `deployment-YYYY-MM-DD.log` | Deployment & release logs |
| **build** | `build-YYYY-MM-DD.log` | Build process logs |
| **startup** | `startup-YYYY-MM-DD.log` | Bot initialization logs |
| **debug** | `debug-YYYY-MM-DD.log` | Debug logs (dev only) |

## Usage

### Via Commands (Discord)

#### Deployment Command
Track deployments directly from Discord:

```
R!deployment start                    # Start deployment
R!deployment complete [version]       # Mark deployment complete
R!deployment rollback [version]       # Log rollback
R!deployment status                   # View log statistics
```

**Example:**
```
R!deployment start
R!deployment complete 2.1.0
R!deployment rollback 2.0.0 Database migration failed
```

#### Logs Command
View and manage logs:

```
R!logs stats                         # View log statistics
R!logs clean <days>                  # Clean logs older than X days (min: 7)
R!logs types                         # List all log types
R!logs recent [type]                 # View last 20 lines of a log
```

**Examples:**
```
R!logs stats                         # Show log statistics
R!logs clean 30                      # Clean logs older than 30 days
R!logs recent error                  # View recent errors
R!logs recent deployment             # View recent deployments
```

### Via NPM Scripts

Log deployments and builds via npm:

```bash
npm run deploy:start        # Log deployment start
npm run deploy:complete     # Log deployment completion
npm run build              # Log build completion
```

### Via Code

Use the logger in your code:

```javascript
import logger from './src/utils/logger.js';

// General logging
logger.info('Application started');
logger.warn('Memory usage high');
logger.error('Database connection failed', error);
logger.info('Debug information', data);

// Deployment logging
logger.deployment('Deploying version 2.1.0', {
    version: '2.1.0',
    environment: 'production'
});

// Build logging
logger.build('Build completed', {
    duration: '5.2s',
    success: true
});

// Command logging
logger.command('kick', user, guild, true);

// Event logging
logger.event('guildMemberAdd', { guild: 'Server Name' });

// Database logging
logger.database('User profile created', true);

// Performance logging
logger.performance('Command execution', 125, { command: 'play' });

// Startup logging
logger.startup('Bot initialized successfully');
```

## Log Format

Each log entry includes:
- **Timestamp**: ISO 8601 format
- **Level**: INFO, WARN, ERROR, DEBUG, DEPLOY, BUILD, etc.
- **Message**: Descriptive message
- **Data**: Additional context (JSON format)

**Example:**
```
[2025-12-11T10:30:45.123Z] [DEPLOY] Deployment started
Data: {
  "version": "2.1.0",
  "initiatedBy": "Admin#1234 (123456789)",
  "environment": "production"
}
```

## Automatic Logging

The following events are automatically logged:

### Startup
- Bot initialization start/complete
- Database connection
- Commands loaded
- Events loaded
- Total initialization time

### Command Execution
- Command name
- User who executed
- Guild where executed
- Success/failure status
- Execution time (performance)
- Any errors

### Events
- Discord events (ready, guildCreate, etc.)
- Status changes
- Guild joins/leaves

### Database
- Connection status
- Query operations
- Errors

### Errors
- Unhandled rejections
- Uncaught exceptions
- Command errors
- Event errors

### Performance
- Command execution time
- Database query time
- Bot initialization time
- API response times

## Log Maintenance

### Automatic Cleanup
Logs older than 30 days are automatically cleaned on startup (configurable).

### Manual Cleanup
```
R!logs clean <days>
```
Minimum: 7 days for safety

### View Statistics
```
R!logs stats
```
Shows:
- Total log files
- Total size
- Breakdown by type

## Deployment Workflow

### Full Deployment Example

```bash
# 1. Start deployment logging
npm run deploy:start

# 2. Pull latest changes
git pull origin master

# 3. Install dependencies
npm install

# 4. Run build (if applicable)
npm run build

# 5. Start bot
npm start

# 6. Mark deployment complete
npm run deploy:complete
```

Or via Discord:
```
R!deployment start
# ... deploy bot ...
R!deployment complete 2.1.0
```

### Rollback Example

```bash
# Via Discord
R!deployment rollback 2.0.0 Critical bug in new feature
```

## Monitoring

### Check Recent Logs
```
R!logs recent deployment
R!logs recent error
R!logs recent performance
```

### Check Log Statistics
```
R!logs stats
R!deployment status
```

## Benefits

1. **Full Audit Trail**: Every deployment, build, and command is logged
2. **Error Tracking**: All errors captured with stack traces
3. **Performance Monitoring**: Track command and operation timings
4. **Easy Debugging**: Detailed logs for troubleshooting
5. **Compliance**: Complete activity logs for auditing
6. **Remote Management**: Monitor and manage logs from Discord

## Log Retention

- **Default**: 30 days
- **Minimum**: 7 days (safety limit)
- **Storage**: Logs are excluded from git (in .gitignore)
- **Format**: Plain text files for easy parsing

## Security

- Logs are stored locally only
- `.gitignore` prevents committing logs to repository
- Sensitive data (tokens, passwords) are NOT logged
- Only administrators can access log commands

## Performance Impact

- **Minimal**: Async file writes
- **Non-blocking**: Won't slow down bot operations
- **Efficient**: Daily log rotation
- **Automatic**: Old logs cleaned up automatically

## Future Enhancements

Potential additions:
- Log file downloads via Discord
- Log filtering and search
- Real-time log streaming
- External log aggregation (e.g., Elasticsearch)
- Alert notifications for critical errors
- Log analytics dashboard
