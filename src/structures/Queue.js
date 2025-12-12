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

    async create(guild, voice, channel, givenNode) {
        let dispatcher = this.get(guild.id);
        if (!voice) throw new Error('No voice channel was provided');
        if (!channel) throw new Error('No text channel was provided');
        if (!guild) throw new Error('No guild was provided');
        if (!dispatcher) {
            try {
                const node = givenNode || this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes);
                const player = await this.client.shoukaku.joinVoiceChannel({
                    guildId: guild.id,
                    channelId: voice.id,
                    shardId: guild.shardId || 0,
                    deaf: true,
                });
                
                // Add error handler to player
                player.on('error', (error) => {
                    console.error(`❌ Player error for guild ${guild.id}:`, error);
                });
                
                dispatcher = new Dispatcher({
                    client: this.client,
                    guildId: guild.id,
                    channelId: channel.id,
                    player,
                    node,
                });
                this.set(guild.id, dispatcher);
                this.client.shoukaku.emit('playerCreate', dispatcher.player);
                return dispatcher;
            } catch (error) {
                console.error('❌ Failed to create player:', error);
                throw error;
            }
        } else {
            return dispatcher;
        }
    }

    async search(query) {
        const node = this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes);
        const regex = /^https?:\/\//;
        let result;
        try {
            console.log('🔍 Queue.search() - Resolving query:', query);
            result = await node.rest.resolve(regex.test(query) ? query : `${this.client.config.searchEngine}:${query}`);
            console.log('✅ Queue.search() - Result received:', JSON.stringify(result, null, 2));
        } catch (err) {
            console.error('❌ Queue.search() - Error:', err);
            return null;
        }
        return result;
    }
}

export default Queue;
