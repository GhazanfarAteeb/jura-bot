import Dispatcher from './Dispatcher.js';

class Queue extends Map {
    constructor(client) {
        super();
      this.client = client;
      console.log('✅ Queue system initialized.');
    }

    get(guildId) {
      console.log(`🔍 Queue.get() - Retrieving dispatcher for guild ID: ${guildId}`);
      return super.get(guildId);
      
    }

  set(guildId, dispatcher) {
      console.log(`💾 Queue.set() - Setting dispatcher for guild ID: ${guildId}`);
        return super.set(guildId, dispatcher);
    }

  delete(guildId) {
      console.log(`🗑️ Queue.delete() - Deleting dispatcher for guild ID: ${guildId}`);
        return super.delete(guildId);
    }

  clear() {
      console.log('🧹 Queue.clear() - Clearing all dispatchers from the queue.');
        return super.clear();
    }

  async create(guild, voice, channel, givenNode) {
        console.log(`🎶 Queue.create() - Creating dispatcher for guild ID: ${guild.id}`);
        let dispatcher = this.get(guild.id);
    if (!voice) {
      
      throw new Error('No voice channel was provided');
    }
        if (!channel) {
          throw new Error('No text channel was provided');
        }
        if (!guild) {
          throw new Error('No guild was provided');
        }
    if (!dispatcher) {
          console.log(`➕ Queue.create() - No existing dispatcher found. Creating new dispatcher for guild ID: ${guild.id}`);
            try {
              const node = givenNode || this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes);
              console.log(`🔗 Queue.create() - Joining voice channel ID: ${voice.id} in guild ID: ${guild.id}`)
                console.log("🔗 Node details:", node);
                const player = await this.client.shoukaku.joinVoiceChannel({
                    guildId: guild.id,
                    channelId: voice.id,
                  shardId: guild.shardId || 0,
                  deaf: true,
                });
              console.log(`✅ Queue.create() - Joined voice channel ID: ${voice.id} and created player for guild ID: ${guild.id}`);
                
                // Add error handler to player
                player.on('error', (error) => {
                    console.error(`❌ Player error for guild ${guild.id}:`, error);
                });
                
              console.log(`✅ Queue.create() - Voice channel joined and player created for guild ID: ${guild.id}`);
                dispatcher = new Dispatcher({
                    client: this.client,
                    guildId: guild.id,
                    channelId: channel.id,
                    player,
                    node,
                });
              console.log(`💾 Queue.create() - Dispatcher created for guild ID: ${guild.id}`);
                this.set(guild.id, dispatcher);
                
                console.log(`🚨 Queue.create() - Emitting playerCreate event for guild ID: ${guild.id}`);
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
