export default {
  name: 'queueEnd',
  async execute(client, player) {
    const channel = client.channels.cache.get(player.textChannel);
    
    // Delete now playing message
    if (player.message) {
      await player.message.delete().catch(() => {});
    }

    // Destroy player
    player.destroy();
    
    if (channel) {
      channel.send('Queue has ended.');
    }
  }
};
