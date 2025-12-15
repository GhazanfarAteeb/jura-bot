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

    this.on('ready', (name) => {
      const node = this.nodes.get(name);
      logger.info(`[MusicManager] Lavalink Node: ${name} is now READY - State: ${node?.state}`);
    });
    this.on('error', (name, error) => logger.error(`[MusicManager] Lavalink Node: ${name} emitted an error`, error));
    this.on('close', (name, code, reason) => logger.warn(`[MusicManager] Lavalink Node: ${name} closed with code ${code}. Reason: ${reason || 'No reason'}`));
    this.on('disconnect', (name, players, moved) => {
      if (moved) return;
      players.map(player => player.connection.disconnect());
      logger.warn(`[MusicManager] Lavalink Node: ${name} disconnected`);
    });
  }


  getNode() {
    // Shoukaku v4: manually select the best node (least players)
    const nodes = [...this.nodes.values()];
    logger.info(`[MusicManager] getNode() - Total nodes: ${nodes.length}`);

    nodes.forEach(node => {
      logger.info(`[MusicManager] Node "${node.name}" - State: ${node.state} (type: ${typeof node.state}), Stats: ${JSON.stringify(node.stats)}`);
    });

    // Shoukaku states: 0=DISCONNECTED, 1=CONNECTED, 2=CONNECTING, 3=RECONNECTING
    // Check if node has stats to ensure it's actually ready
    const connectedNodes = nodes.filter(n => {
      const hasStats = n.stats && typeof n.stats.players !== 'undefined';
      const isConnected = n.state === 1; // 1 = CONNECTED in current Shoukaku version
      return hasStats && isConnected;
    });

    logger.info(`[MusicManager] Connected nodes with stats: ${connectedNodes.length}`);

    if (connectedNodes.length === 0) {
      logger.warn(`[MusicManager] No fully connected nodes found`);
      // Return null instead of fallback - let the calling code handle it
      return null;
    }

    const selectedNode = connectedNodes.sort((a, b) => a.stats.players - b.stats.players)[0];
    logger.info(`[MusicManager] Selected node: "${selectedNode.name}" with ${selectedNode.stats.players} active players`);
    return selectedNode;
  }

  getQueue(guildId) {
    return this.queues.get(guildId);
  }

  isPlaying() {
    return this.queues.some(queue => queue.isPlaying());
  }

  createQueue(guild, channel, messageChannel) {
    logger.info(`[MusicManager] createQueue called for guild ${guild.id}`);

    const existingQueue = this.getQueue(guild.id);
    if (existingQueue) {
      logger.info(`[MusicManager] Returning existing queue for guild ${guild.id}`);
      return existingQueue;
    }

    logger.info(`[MusicManager] Creating new queue for guild ${guild.id} in channel ${channel.id}`);

    const dispatcher = new Dispatcher({
      client: this.client,
      guild: guild,
      channelId: channel.id,
      channel: messageChannel,
      node: this.getNode()
    });

    this.queues.set(guild.id, dispatcher);
    logger.info(`[MusicManager] Queue created and stored for guild ${guild.id}. Total queues: ${this.queues.size}`);
    return dispatcher;
  }
}
