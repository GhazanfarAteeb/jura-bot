import { players } from '../utils/shoukaku.js';
import Dispatcher from './Dispatcher.js';

class Queue extends Map {
    constructor(client) {
        super();
        this.client = client;
    }

    get(guildId) {
        return super.get(guildId);
    }

    set(guildId, dispatcher) {
        return super.set(guildId, dispatcher);
    }

    delete(guildId) {
        return super.delete(guildId);
    }

    clear() {
        return super.clear();
    }

    async create(guild, voice, channel, node) {
        let dispatcher = this.get(guild.id);
        if (!voice) throw new Error('No voice channel was provided');
        if (!channel) throw new Error('No text channel was provided');
        if (!guild) throw new Error('No guild was provided');
        
        if (!dispatcher) {
            const player = await node.joinChannel({
                guildId: guild.id,
                channelId: voice.id,
                shardId: guild.shardId || 0
            });
            
            dispatcher = new Dispatcher({
                client: this.client,
                guildId: guild.id,
                channelId: channel.id,
                player,
                node,
            });
            
            this.set(guild.id, dispatcher);
            return dispatcher;
        } else {
            return dispatcher;
        }
    }

    async search(query) {
        const { shoukaku } = await import('../utils/shoukaku.js');
        const node = shoukaku.options.nodeResolver(shoukaku.nodes);
        const regex = /^https?:\/\//;
        let result;
        
        try {
            // If it's a URL, use it directly; otherwise, add ytsearch prefix
            result = await node.rest.resolve(regex.test(query) ? query : `ytsearch:${query}`);
        } catch (err) {
            console.error('Search error:', err);
            return null;
        }
        
        return result;
    }
}

export default Queue;
