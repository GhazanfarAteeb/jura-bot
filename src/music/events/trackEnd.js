export default {
  name: 'trackEnd',
  async execute(client, player) {
    // Delete now playing message
    if (player.message) {
      await player.message.delete().catch(() => { });
    }
  }
};
