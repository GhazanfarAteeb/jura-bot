import 'dotenv/config';
import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder } from 'discord.js';
import mongoose from 'mongoose';
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';
import path from 'path';
import { fileURLToPath } from 'url';
import { readdirSync } from 'fs';
import { initializeSchedulers } from './utils/schedulers.js';
import { initializeShoukaku } from './utils/shoukaku.js';
import express from 'express';
import Guild from './models/Guild.js';
import logger from './utils/logger.js';
import ServerData from './database/server.js';

// Load encryption libraries for voice (discord-voip compatibility)
// discord-voip looks for methods object with open/close methods
console.log('🔐 Loading encryption libraries for voice...');

let encryptionLoaded = false;

// Try libsodium-wrappers first (best compatibility with discord-voip)
try {
    const libsodium = await import('libsodium-wrappers');
    await libsodium.ready;
    
    // Expose for @discordjs/voice
    global.sodium = libsodium;
    
    // Also expose methods for discord-voip compatibility
    if (!global.sodium.methods) {
        global.sodium.methods = libsodium;
    }
    
    console.log('✅ Loaded libsodium-wrappers for voice encryption');
    console.log('   Available methods:', Object.keys(libsodium).filter(k => k.includes('crypto')).slice(0, 5).join(', '), '...');
    encryptionLoaded = true;
} catch (err) {
    console.log(`⚠️  libsodium-wrappers not available: ${err.message}`);
}

// Fallback to other libraries if needed
if (!encryptionLoaded) {
    const fallbacks = [
        '@stablelib/xchacha20poly1305',
        '@noble/ciphers/chacha',
        'tweetnacl'
    ];
    
    for (const lib of fallbacks) {
        try {
            const module = await import(lib);
            global.sodium = module;
            console.log(`✅ Loaded ${lib} for voice encryption`);
            encryptionLoaded = true;
            break;
        } catch (err) {
            console.log(`⚠️  ${lib} not available`);
        }
    }
}

if (encryptionLoaded) {
    console.log('✅ Encryption library exposed globally for voice');
    console.log('   global.sodium available:', !!global.sodium);
} else {
    console.error('❌ No encryption library could be loaded - voice will not work');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
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

// Initialize database
client.db = new ServerData();
client.cooldowns = new Collection();
client.invites = new Collection();

// Configuration
client.config = {
    searchEngine: 'ytmsearch',
    maxQueueSize: 1000,
    maxPlaylistSize: 100,
    icons: {
        youtube: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938236589654096/youtube.png',
        spotify: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938236811714601/spotify.png',
        soundcloud: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938237063569428/soundcloud.png',
        applemusic: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938236052029460/applemusic.png',
        deezer: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938236320464896/deezer.png'
    },
    links: {
        img: 'https://cdn.discordapp.com/attachments/983711842708811827/1065938236589654096/music.png'
    },
    logChannelId: process.env.LOG_CHANNEL_ID || null
};

// Wave-Music compatibility: Add embed builder and colors
client.embed = () => new EmbedBuilder();
client.color = {
    main: '#0099ff',
    red: '#ff0000',
    green: '#00ff00',
    yellow: '#ffff00'
};

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
    const commandFolders = readdirSync(path.join(__dirname, 'commands'));
    let totalCommands = 0;
    
    for (const folder of commandFolders) {
        const commandFiles = readdirSync(path.join(__dirname, 'commands', folder))
            .filter(file => file.endsWith('.js'));
        
        for (const file of commandFiles) {
            try {
                const { default: CommandClass } = await import(`./commands/${folder}/${file}`);
                
                // Check if it's a Wave-Music Command class (needs instantiation)
                if (typeof CommandClass === 'function' && CommandClass.prototype.run) {
                    const commandInstance = new CommandClass(client);
                    if (commandInstance.name) {
                        client.commands.set(commandInstance.name, commandInstance);
                        console.log(`📝 Loaded command: ${commandInstance.name}`);
                        totalCommands++;
                    }
                }
                // Legacy command object format (plain object with execute method)
                else if (CommandClass && CommandClass.name && CommandClass.execute) {
                    client.commands.set(CommandClass.name, CommandClass);
                    console.log(`📝 Loaded command: ${CommandClass.name}`);
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
    const eventsPath = readdirSync(path.join(__dirname, "./events"));
    let totalEvents = 0;
    
    for (const dir of eventsPath) {
        try {
            const events = readdirSync(path.join(__dirname, `./events/${dir}`))
                .filter((file) => file.endsWith(".js"));
            
            for (const file of events) {
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
                        eventHandler = (...args) => EventClass.execute(...args);
                    } else {
                        throw new Error(`Invalid event format in ${file}`);
                    }
                    
                    switch (dir) {
                        case "player":
                            client.shoukaku.on(eventName, eventHandler);
                            break;
                        default:
                            client.on(eventName, eventHandler);
                            break;
                    }
                    
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
    
    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);
    
    const duration = Date.now() - startTime;
    logger.performance('Bot initialization', duration);
    logger.startup(`Bot started successfully in ${duration}ms`);
    
    // Initialize Shoukaku and events after client is ready
    client.once('ready', async () => {
        // Initialize Shoukaku first
        initializeShoukaku(client);
        console.log('✅ Shoukaku initialized');
        
        // Load events after Shoukaku is ready
        await loadEvents();
        
        // Initialize schedulers
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

// Start status monitoring when bot is ready
client.once('ready', () => {
    startStatusMonitoring();
    
    // Send initial online message
    notifyStatusChange('online');
});

export default client;