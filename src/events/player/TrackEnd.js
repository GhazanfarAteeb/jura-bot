import Event from "../../structures/Event.js";

export default class TrackEnd extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "trackEnd",
    });
  }

  async run(player, track, dispatcher) {
    dispatcher.previous = dispatcher.current;
    dispatcher.current = null;
    const m = await dispatcher.nowPlayingMessage?.fetch().catch(() => {});
    console.log(`⏹️ Track ended in guild ID: ${dispatcher.guildId} - Track: ${track.info.title}`);
    console.log("Track Ended Reason :", player.track?.reason || "unknown");
    // Handle track load failures
    if (player.track && player.track.reason === 'loadFailed') {
      console.log('⚠️ Track failed to load, skipping to next track');
      const channel = this.client.channels.cache.get(dispatcher.channelId);
      if (channel) {
        await channel.send({
          embeds: [{
            color: 0xff0000,
            description: '❌ Failed to load track. Skipping to next song...'
          }]
        }).catch(() => {});
      }
      // Don't add to queue again, just play next
    } else {
      // Normal playback - handle loops
      if (dispatcher.loop === "repeat") dispatcher.queue.unshift(track);
      if (dispatcher.loop === "queue") dispatcher.queue.push(track);
    }
    
    await dispatcher.play();
    if (dispatcher.autoplay) {
      await dispatcher.Autoplay(track);
    }
    if (m && m.deletable) await m.delete().catch(() => {});
  }
};
