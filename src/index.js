import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';
import { initializeSchedulers } from './utils/schedulers.js';
import express from 'express';
import Guild from './models/Guild.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Express app for health checks
const app = express();
const PORT = process.env.PORT || 3000;

// Create Discord client with necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildPresences
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
        Partials.GuildMember
    ]
});

// Collections for commands and events
client.commands = new Collection();
client.cooldowns = new Collection();
client.invites = new Collection();

// Connect to MongoDB
async function connectDatabase() {
    try {
        const startTime = Date.now();
        await mongoose.connect(process.env.MONGODB_URI);
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

// Load commands
async function loadCommands() {
    const commandFolders = readdirSync(join(__dirname, 'commands'));
    let totalCommands = 0;
    
    for (const folder of commandFolders) {
        const commandFiles = readdirSync(join(__dirname, 'commands', folder))
            .filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const { default: command } = await import(`./commands/${folder}/${file}`);
                if (command.name) {
                    client.commands.set(command.name, command);
                    console.log(`📝 Loaded command: ${command.name}`);
                    totalCommands++;
                }
            } catch (error) {
                logger.error(`Failed to load command ${file}`, error);
            }
        }
    }
    
    logger.startup(`Loaded ${totalCommands} commands`);
}

// Load events
async function loadEvents() {
    const eventFiles = readdirSync(join(__dirname, 'events'))
        .filter(file => file.endsWith('.js'));
    let totalEvents = 0;
    
    for (const file of eventFiles) {
        try {
            const { default: event } = await import(`./events/${file}`);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`🎯 Loaded event: ${event.name}`);
            totalEvents++;
        } catch (error) {
            logger.error(`Failed to load event ${file}`, error);
        }
    }
    
    logger.startup(`Loaded ${totalEvents} events`);
}

// Initialize bot
async function initialize() {
    const startTime = Date.now();
    logger.startup('Starting JURA BOT...');
    logger.build('Bot version: 2.1.0');
    logger.build('Node version: ' + process.version);
    logger.build('Environment: ' + (process.env.NODE_ENV || 'production'));
    console.log('🚀 Starting JURA BOT...');
    
    await connectDatabase();
    await loadCommands();
    await loadEvents();
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
    const duration = Date.now() - startTime;
    logger.performance('Bot initialization', duration);
    logger.startup(`Bot started successfully in ${duration}ms`);
    
    // Initialize scheduled tasks (birthdays, events, etc.)
    client.once('ready', () => {
        initializeSchedulers(client);
    });
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
        name: 'JURA BOT',
        version: '2.0.0',
        status: 'running',
        message: 'Bot is online and operational'
    });
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

// Start status monitoring when bot is ready
client.once('ready', () => {
    startStatusMonitoring();
    
    // Send initial online message
    notifyStatusChange('online');
});

export default client;
