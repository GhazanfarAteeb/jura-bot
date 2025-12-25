import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ShardingManager, ShardEvents } from 'discord.js';
import mongoose from 'mongoose';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { initializeSchedulers } from './utils/schedulers.js';
import express from 'express';
import Guild from './models/Guild.js';
import logger from './utils/logger.js';
import ServerData from './database/server.js';
import Utils from './structures/Utils.js';
import RiffyManager from './music/RiffyManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app for health checks
const app = express();
const PORT = process.env.PORT || 3001;

// Create Discord client with necessary intents (optimized)
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User,
    Partials.GuildMember
  ],
  // WebSocket optimizations
  ws: {
    compress: true, // Enable compression for reduced bandwidth
    large_threshold: 50 // Only request offline members for servers < 50 members
  },
  sweepers: {
    // Sweep messages every 5 minutes to free memory
    messages: {
      interval: 300,
      lifetime: 900
    },
    // Sweep users not in voice channels
    users: {
      interval: 3600,
      filter: () => user => {
        // Keep bot users and users in voice channels
        if (user.bot) return false;
        return !client.guilds.cache.some(guild =>
          guild.members.cache.get(user.id)?.voice?.channel
        );
      }
    }
  }
});

// Collections for commands and events
client.commands = new Collection();
client.cooldowns = new Collection();
client.invites = new Collection();
client.aliases = new Collection();

// Initialize database
client.db = new ServerData();

// Initialize utils
client.utils = Utils;

// Initialize Riffy Music Manager
const riffyManager = new RiffyManager(client);
client.riffyManager = riffyManager;

// Configuration
client.config = {
  logChannelId: process.env.LOG_CHANNEL_ID || null
};



// Logger setup
client.logger = logger;

// Add embed builder and colors
client.embed = () => new EmbedBuilder();
client.color = {
  main: '#0099ff',
  red: '#ff0000',
  green: '#00ff00',
  yellow: '#ffff00'
};

// Connect to MongoDB with optimized settings
async function connectDatabase() {
  try {
    const startTime = Date.now();
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    });
    const duration = Date.now() - startTime;
    logger.database('MongoDB connection established', true);
    logger.performance('Database connection', duration);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    logger.database('MongoDB connection failed', false, error);
    logger.error('MongoDB connection error', error);
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

// Load commands in parallel for faster startup
async function loadCommands() {
  const commandFolders = readdirSync(path.join(__dirname, 'commands'));
  let totalCommands = 0;

  // Load all commands in parallel
  const commandPromises = [];

  for (const folder of commandFolders) {
    const commandFiles = readdirSync(path.join(__dirname, 'commands', folder))
      .filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
      commandPromises.push(
        import(`./commands/${folder}/${file}`)
          .then(({ default: CommandClass }) => {
            // Check if it's a Wave-Music Command class (needs instantiation)
            if (typeof CommandClass === 'function' && CommandClass.prototype.run) {
              const commandInstance = new CommandClass(client);
              if (commandInstance.name) {
                client.commands.set(commandInstance.name, commandInstance);
                if (commandInstance.aliases && Array.isArray(commandInstance.aliases)) {
                  commandInstance.aliases.forEach(alias => client.aliases.set(alias, commandInstance.name));
                }
                console.log(`📝 Loaded command: ${commandInstance.name}`);
                return 1;
              }
            }
            // Legacy command object format (plain object with execute method)
            else if (CommandClass && CommandClass.name && CommandClass.execute) {
              client.commands.set(CommandClass.name, CommandClass);
              if (CommandClass.aliases && Array.isArray(CommandClass.aliases)) {
                CommandClass.aliases.forEach(alias => client.aliases.set(alias, CommandClass.name));
              }
              console.log(`📝 Loaded command: ${CommandClass.name}`);
              return 1;
            }
            return 0;
          })
          .catch(error => {
            logger.error(`Failed to load command ${file}`, error);
            return 0;
          })
      );
    }
  }

  // Wait for all commands to load
  const results = await Promise.all(commandPromises);
  totalCommands = results.reduce((sum, count) => sum + count, 0);

  logger.startup(`Loaded ${totalCommands} commands`);
}

// Load events
async function loadEvents() {
  const eventsPath = readdirSync(path.join(__dirname, "./events"));
  let totalEvents = 0;

  // Skip these files - they are initialized separately or called from schedulers
  const skipFiles = ['antiNuke.js', 'messageLogging.js', 'reminderHandler.js'];

  for (const dir of eventsPath) {
    // Skip music events - they are loaded separately
    if (dir === 'music') continue;

    try {
      const events = readdirSync(path.join(__dirname, `./events/${dir}`))
        .filter((file) => file.endsWith(".js"));

      for (const file of events) {
        // Skip special files that are initialized separately
        if (skipFiles.includes(file)) {
          console.log(`⏭️ Skipping ${file} (initialized separately)`);
          continue;
        }

        try {
          console.log("📂 Loading event:", file);
          const EventModule = await import(`./events/${dir}/${file}`);
          const EventClass = EventModule.default || EventModule;

          // Handle both Event class format and plain object format
          let evt, eventName, eventHandler;

          if (typeof EventClass === 'function') {
            // Event class format (player events)
            evt = new EventClass(client, file);
            eventName = evt.name;
            eventHandler = (...args) => evt.run(...args);
          } else if (typeof EventClass === 'object' && EventClass.execute) {
            // Plain object format (client events)
            eventName = EventClass.name;
            eventHandler = (...args) => EventClass.execute(...args, client);
          } else {
            throw new Error(`Invalid event format in ${file}`);
          }

          // Register event with client
          client.on(eventName, eventHandler);

          totalEvents++;
        } catch (error) {
          console.error(`Error loading event ${file}:`, error);
          logger.error(`Failed to load event ${file}`, error);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
      logger.error(`Failed to read events directory ${dir}`, error);
    }
  }

  logger.startup(`Loaded ${totalEvents} events`);
}

// Load music events specifically
async function loadMusicEvents() {
  const musicEventsPath = path.join(__dirname, "./events/music");
  let totalMusicEvents = 0;

  try {
    const events = readdirSync(musicEventsPath).filter((file) => file.endsWith(".js"));

    for (const file of events) {
      try {
        console.log("🎵 Loading music event:", file);
        const EventModule = await import(`./events/music/${file}`);
        const EventClass = EventModule.default || EventModule;

        if (typeof EventClass === 'function') {
          const evt = new EventClass(client, file);
          const eventName = evt.name;
          const eventHandler = (...args) => evt.run(...args);

          // Register event with client
          client.on(eventName, eventHandler);
          totalMusicEvents++;
        }
      } catch (error) {
        console.error(`Error loading music event ${file}:`, error);
        logger.error(`Failed to load music event ${file}`, error);
      }
    }
  } catch (error) {
    console.error('Error reading music events directory:', error);
    logger.error('Failed to read music events directory', error);
  }

  logger.startup(`Loaded ${totalMusicEvents} music events`);
  console.log(`🎵 Loaded ${totalMusicEvents} music events`);
}

// Initialize bot
async function initialize() {
  const startTime = Date.now();
  logger.startup('Starting RAPHAEL...');
  logger.build('Bot version: 2.1.0');
  logger.build('Node version: ' + process.version);
  logger.build('Environment: ' + (process.env.NODE_ENV || 'production'));
  console.log('🚀 Starting RAPHAEL...');

  await connectDatabase();
  await loadCommands();

  // Login to Discord first
  await client.login(process.env.DISCORD_TOKEN);

  const duration = Date.now() - startTime;
  logger.performance('Bot initialization', duration);
  logger.startup(`Bot started successfully in ${duration}ms`);

  // Initialize events after client is ready
  client.once('ready', async () => {
    console.log('🤖 Client is ready!');
    console.log(`   Logged in as: ${client.user.tag}`);
    console.log(`   Guilds: ${client.guilds.cache.size}`);
    console.log(`   WS Status: ${client.ws.status}, Ping: ${client.ws.ping}ms`);

    // Initialize Riffy Music System
    try {
      riffyManager.initialize();
      riffyManager.initializePlayer();
      console.log('🎵 Music system initialized!');
    } catch (error) {
      logger.error('Failed to initialize music system:', error);
      console.error('❌ Failed to initialize music system:', error.message);
    }

    // Load event handlers
    await loadEvents();

    // Load music events
    await loadMusicEvents();

    // Initialize security systems
    await initializeSecuritySystems(client);

    // Register slash commands
    await registerSlashCommandsOnReady(client);

    // Initialize schedulers
    initializeSchedulers(client);

    // Start status monitoring
    startStatusMonitoring();

    // Send initial online message
    notifyStatusChange('online');

    console.log('✅ All systems initialized and ready!');
  });
}

// Initialize security systems (anti-nuke, anti-raid, message logging)
async function initializeSecuritySystems(client) {
  try {
    // Initialize anti-nuke
    const antiNuke = await import('./events/client/antiNuke.js');
    if (antiNuke.default?.initialize) {
      await antiNuke.default.initialize(client);
    }

    // Initialize message logging
    const messageLogging = await import('./events/client/messageLogging.js');
    if (messageLogging.default?.initialize) {
      await messageLogging.default.initialize(client);
    }

    console.log('🛡️ Security systems initialized!');
  } catch (error) {
    console.error('Error initializing security systems:', error);
    logger.error('Failed to initialize security systems', error);
  }
}

// Register slash commands
async function registerSlashCommandsOnReady(client) {
  try {
    const { registerSlashCommands } = await import('./utils/slashCommands.js');
    const commandCount = await registerSlashCommands(client);
    console.log(`📝 Registered ${commandCount} slash commands`);
  } catch (error) {
    console.error('Error registering slash commands:', error);
    logger.error('Failed to register slash commands', error);
  }
}

// Error handling
process.on('unhandledRejection', error => {
  logger.error('Unhandled promise rejection', error);
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  logger.error('Uncaught exception', error);
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  logger.info('Bot shutting down (SIGINT)');

  // Stop Spotify token refresh
  // spotifyTokenManager.stop();

  // Disconnect from Discord
  client.destroy();

  // Close database connection
  await mongoose.connection.close();

  console.log('✅ Shutdown complete');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  logger.info('Bot shutting down (SIGTERM)');

  // Stop Spotify token refresh
  // spotifyTokenManager.stop();

  // Disconnect from Discord
  client.destroy();

  // Close database connection
  await mongoose.connection.close();

  console.log('✅ Shutdown complete');
  process.exit(0);
});

// Health check endpoint
app.get('/health', (req, res) => {
  const uptime = process.uptime();
  const status = {
    status: 'online',
    uptime: Math.floor(uptime),
    uptimeFormatted: formatUptime(uptime),
    timestamp: new Date().toISOString(),
    bot: {
      ready: client.readyAt ? true : false,
      guilds: client.guilds.cache.size,
      users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
      ping: client.ws.ping
    },
    database: {
      connected: mongoose.connection.readyState === 1
    }
  };

  res.json(status);
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAPHAEL',
    version: '2.1.0',
    status: 'running',
    message: 'Bot is online and operational',
    endpoints: {
      health: '/health',
      commands: '/commands'
    }
  });
});

// Commands page endpoint
app.get('/commands', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/commands.html'));
});

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}

// Start Express server
app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
});

// Monitor bot status and send updates
let lastStatus = 'online';
let statusCheckInterval;

function startStatusMonitoring() {
  statusCheckInterval = setInterval(async () => {
    const currentStatus = client.ws.status === 0 ? 'online' : 'offline';

    if (currentStatus !== lastStatus) {
      lastStatus = currentStatus;
      await notifyStatusChange(currentStatus);
    }
  }, 60000); // Check every minute
}

async function notifyStatusChange(status) {
  logger.event(`Bot status changed to ${status}`);

  try {
    const guilds = await Guild.find({ 'channels.botStatus': { $exists: true, $ne: null } });

    for (const guildConfig of guilds) {
      try {
        const guild = client.guilds.cache.get(guildConfig.guildId);
        if (!guild) continue;

        const channel = guild.channels.cache.get(guildConfig.channels.botStatus);
        if (!channel) continue;

        const embed = new EmbedBuilder()
          .setTitle(`🤖 Bot Status Update`)
          .setDescription(status === 'online'
            ? '✅ **Bot is now ONLINE**\nAll systems operational.'
            : '❌ **Bot is now OFFLINE**\nTrying to reconnect...')
          .setColor(status === 'online' ? '#00ff00' : '#ff0000')
          .addFields(
            { name: 'Status', value: status.toUpperCase(), inline: true },
            { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true }
          )
          .setTimestamp();

        await channel.send({ embeds: [embed] });
      } catch (error) {
        console.error(`Error sending status update to guild ${guildConfig.guildId}:`, error);
      }
    }
  } catch (error) {
    console.error('Error notifying status change:', error);
  }
}

// Start the bot
initialize().catch(console.error);

export default client;