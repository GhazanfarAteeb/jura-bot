export default {
  name: 'trackError',
  async execute(client, player, track, payload) {
    console.log('Track error payload:', payload);

    const channel = client.channels.cache.get(player.textChannel);
    if (channel) {
      channel.send(`❌ An error occurred while playing **${track.info.title}**`);
    }
  }
};
