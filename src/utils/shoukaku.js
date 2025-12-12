import { Shoukaku, Connectors } from 'shoukaku';
import Queue from '../structures/Queue.js';

// Player data storage
export const players = new Map();

// Shoukaku instance (initialized later)
export let shoukaku = null;

// Initialize Shoukaku with client
export function initializeShoukaku(client) {
    // Lavalink nodes configuration
    const nodes = [{
        name: 'Main',
        url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
        auth: process.env.LAVALINK_PASSWORD,
        secure: process.env.LAVALINK_SECURE === 'true'
    }];

    // Create Shoukaku instance
    shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
        moveOnDisconnect: false,
        resume: false,
        resumeTimeout: 30,
        reconnectTries: 2,
        reconnectInterval: 5,
        restTimeout: 10000,
        userAgent: 'Jura-Bot/2.0',
        nodeResolver: nodes => [...nodes.values()].sort((a, b) => a.penalties - b.penalties).shift()
    });

    // Initialize Queue system
    client.queue = new Queue(client);
    client.shoukaku = shoukaku;

    // Event handlers
    shoukaku.on('ready', (name) => {
        console.log(`✅ Lavalink ${name} is ready!`);
    });

    shoukaku.on('error', (name, error) => {
        console.error(`❌ Lavalink ${name} error:`, error);
    });

    shoukaku.on('close', (name, code, reason) => {
        console.log(`⚠️ Lavalink ${name} closed: ${code} - ${reason}`);
    });

    shoukaku.on('disconnect', (name, reason) => {
        console.log(`⚠️ Lavalink ${name} disconnected:`, reason);
    });

    shoukaku.on('debug', (name, info) => {
        console.log(`🔍 Lavalink ${name} debug:`, info);
    });
    
    // Track start event - send now playing message
    shoukaku.on('trackStart', async (player, track, dispatcher) => {
        const channel = client.channels.cache.get(dispatcher.channelId);
        if (channel) {
            await channel.send({
                embeds: [{
                    color: 0x00ff00,
                    title: '🎵 Now Playing',
                    description: `**[${track.info.title}](${track.info.uri})**\nBy: ${track.info.author}\nRequested by: ${track.info.requester}`,
                    timestamp: new Date()
                }]
            });
        }
    });
    
    // Track end event - play next track
    shoukaku.on('trackEnd', async (player, track, dispatcher) => {
        if (dispatcher.loop === 'track') {
            dispatcher.queue.unshift(track);
        } else if (dispatcher.loop === 'queue') {
            dispatcher.queue.push(track);
        }
        
        await dispatcher.play();
    });
    
    // Queue end event - disconnect
    shoukaku.on('queueEnd', async (player, track, dispatcher) => {
        const channel = client.channels.cache.get(dispatcher.channelId);
        if (channel) {
            await channel.send({
                embeds: [{
                    color: 0xff9900,
                    title: '👋 Queue Ended',
                    description: 'The queue has ended. See you next time!',
                    timestamp: new Date()
                }]
            });
        }
        
        setTimeout(() => {
            if (dispatcher.exists) {
                dispatcher.destroy();
            }
        }, 60000); // 1 minute delay
    });

    return shoukaku;
}

export default { shoukaku, players, initializeShoukaku };
