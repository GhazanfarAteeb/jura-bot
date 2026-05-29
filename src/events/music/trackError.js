/**
 * Music Track Error Event Handler
 * Handles errors during track playback
 */

import Event from "../../structures/Event.js";

class MusicTrackError extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "musicTrackError",
    });
  }

  async run(player, track, payload) {
    try {
      const channel = this.client.channels.cache.get(player.textChannelId);
      if (!channel) return;

      this.client.logger.error(`Track error for ${track?.title}:`, payload);

      await channel.send({
        embeds: [
          {
            color: 0xff4757,
            title: "『 Playback Error 』",
            description: `**Error:** Track processing failure detected for: **${track?.title || "Unknown Track"}**\n\n**Notice:** Proceeding to next queue entry, Master.`,
            timestamp: new Date().toISOString(),
          },
        ],
      });

      // moonlink's trackException handler will move to the next track automatically
    } catch (error) {
      this.client.logger.error("Error in musicTrackError event:", error);
    }
  }
}

export default MusicTrackError;
