import { Shoukaku, Connectors } from 'shoukaku';
import Dispatcher from './Dispatcher.js';
import logger from '../utils/logger.js';

export default class MusicManager extends Shoukaku {
    constructor(client) {
        const nodes = [{
            name: 'Local Node',
            url: `${process.env.LAVALINK_HOST}:${process.env.LAVALINK_PORT}`,
            auth: process.env.LAVALINK_PASSWORD
        }];

        super(new Connectors.DiscordJS(client), nodes, {
            moveOnDisconnect: false,
            resume: false,
            reconnectInterval: 30,
            reconnectTries: 2,
            restTimeout: 10000
        });

        this.client = client;
        this.queues = new Map();

        this.on('ready', (name) => logger.debug(`Lavalink Node: ${name} is now connected`));
        this.on('error', (name, error) => logger.error(`Lavalink Node: ${name} emitted an error`, error));
        this.on('close', (name, code, reason) => logger.debug(`Lavalink Node: ${name} closed with code ${code}. Reason: ${reason || 'No reason'}`));
        this.on('disconnect', (name, players, moved) => {
            if (moved) return;
            players.map(player => player.connection.disconnect());
            logger.debug(`Lavalink Node: ${name} disconnected`);
        });
        });
    }

    getNode() {
        return this.getIdealNode();
    }

    getQueue(guildId) {
        return this.queues.get(guildId);
    }

    createQueue(guild, channel, messageChannel) {
        const existingQueue = this.getQueue(guild.id);
        if (existingQueue) return existingQueue;

        const dispatcher = new Dispatcher({
            client: this.client,
            guild: guild,
            channelId: channel.id,
            channel: messageChannel,
            node: this.getNode()
        });

        this.queues.set(guild.id, dispatcher);
        return dispatcher;
    }
}
