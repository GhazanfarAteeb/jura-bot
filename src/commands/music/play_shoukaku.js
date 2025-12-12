import { shoukaku, players } from '../../utils/shoukaku.js';
import { checkVoiceChannel } from '../../utils/musicPlayer.js';
import { errorEmbed, successEmbed } from '../../utils/embeds.js';

export default {
    name: 'play',
    aliases: ['p'],
    description: 'Play music from YouTube, Spotify, and Apple Music',
    usage: 'play <song name | url>',
    category: 'music',
    cooldown: 3,
    execute: async (client, ctx, args) => {
    const query = args.join(" ");
    let player = client.queue.get(ctx.guild.id);
    const vc = ctx.member;
    if (!player)
      player = await client.queue.create(
        ctx.guild,
        vc.voice.channel,
        ctx.channel
      );
    const res = await this.client.queue.search(query);
    const embed = this.client.embed();
    switch (res.loadType) {
      case LoadType.ERROR:
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription("There was an error while searching."),
          ],
        });
        break;
      case LoadType.EMPTY:
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.red)
              .setDescription("There were no results found."),
          ],
        });
        break;
      case LoadType.TRACK: {
        const track = player.buildTrack(res.data, ctx.author);
        if (player.queue.length > client.config.maxQueueSize)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `The queue is too long. The maximum length is ${client.config.maxQueueSize} songs.`
                ),
            ],
          });
        player.queue.push(track);
        await player.isPlaying();
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `Added [${res.data.info.title}](${res.data.info.uri}) to the queue.`
              ),
          ],
        });
        break;
      }
      case LoadType.PLAYLIST: {
        if (res.data.tracks.length > client.config.maxPlaylistSize)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `The playlist is too long. The maximum length is ${client.config.maxPlaylistSize} songs.`
                ),
            ],
          });
        for (const track of res.data.tracks) {
          const pl = player.buildTrack(track, ctx.author);
          if (player.queue.length > client.config.maxQueueSize)
            return await ctx.sendMessage({
              embeds: [
                embed
                  .setColor(this.client.color.red)
                  .setDescription(
                    `The queue is too long. The maximum length is ${client.config.maxQueueSize} songs.`
                  ),
              ],
            });
          player.queue.push(pl);
        }
        await player.isPlaying();
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `Added ${res.data.tracks.length} songs to the queue.`
              ),
          ],
        });
        break;
      }
      case LoadType.SEARCH: {
        const track1 = player.buildTrack(res.data[0], ctx.author);
        if (player.queue.length > client.config.maxQueueSize)
          return await ctx.sendMessage({
            embeds: [
              embed
                .setColor(this.client.color.red)
                .setDescription(
                  `The queue is too long. The maximum length is ${client.config.maxQueueSize} songs.`
                ),
            ],
          });
        player.queue.push(track1);
        await player.isPlaying();
        ctx.sendMessage({
          embeds: [
            embed
              .setColor(this.client.color.main)
              .setDescription(
                `Added [${res.data[0].info.title}](${res.data[0].info.uri}) to the queue.`
              ),
          ],
        });
        break;
      }
    }
  }
};

// Helper function to format duration
function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
        return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}
