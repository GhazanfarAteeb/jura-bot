import { Shoukaku, Connectors } from 'shoukaku';
import client from '../index.js';

// Lavalink nodes configuration
const nodes = [{
    name: 'Main',
    url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
    auth: process.env.LAVALINK_PASSWORD,
    secure: process.env.LAVALINK_SECURE === 'true'
}];

// Create Shoukaku instance
export const shoukaku = new Shoukaku(new Connectors.DiscordJS(client), nodes, {
    moveOnDisconnect: false,
    resume: false,
    resumeTimeout: 30,
    reconnectTries: 2,
    reconnectInterval: 5,
    restTimeout: 10000,
    userAgent: 'Jura-Bot/2.0'
});

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

// Player data storage
export const players = new Map();

export default shoukaku;
