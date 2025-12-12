import { LoadType } from "shoukaku";
import Command from "../../structures/Command.js";

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: "play",
      description: {
        content: "Plays a song from YouTube or Spotify",
        examples: [
          "play https://www.youtube.com/watch?v=QH2-TGUlwu4",
          "play https://open.spotify.com/track/6WrI0LAC5M1Rw2MnX2ZvEg",
        ],
        usage: "play <song>",
      },
      category: "music",
      aliases: ["p"],
      cooldown: 3,
      args: true,
      player: {
        voice: true,
        dj: false,
        active: false,
        djPerm: null,
      },
      permissions: {
        dev: false,
        client: [
          "SendMessages",
          "ViewChannel",
          "EmbedLinks",
          "Connect",
          "Speak",
        ],
        user: [],
      },
      slashCommand: true,
      options: [
        {
          name: "song",
          description: "The song you want to play",
          type: 3,
          required: true,
          autocomplete: true,
        },
      ],
    });
  }
  async run(client, ctx, args) {
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
        let trackData = res.data;
        console.log(`🔍 Single track loaded: ${JSON.stringify(trackData)}`);
        // Convert Spotify to YouTube using ISRC
        // if (trackData.info.sourceName === 'spotify' && trackData.info.isrc) {
        //     console.log('🔄 Converting Spotify to YouTube via ISRC:', trackData.info.isrc);
        //     const node = this.client.shoukaku.options.nodeResolver(this.client.shoukaku.nodes);
            
        //     // Try multiple ISRC search formats
        //     let ytSearch = null;
            
        //     // Format 1: Quoted ISRC (LavaSrc provider format)
        //     ytSearch = await node.rest.resolve(`ytsearch:"${trackData.info.isrc}"`);
        //     console.log('   - Quoted ISRC search:', ytSearch.loadType, 'tracks:', ytSearch.data?.length || 0);
            
        //     // Format 2: If no results, try ISRC with artist/title
        //     if ((!ytSearch.data || ytSearch.data.length === 0) && trackData.info.title && trackData.info.author) {
        //         ytSearch = await node.rest.resolve(`ytsearch:"${trackData.info.isrc}" ${trackData.info.author} ${trackData.info.title}`);
        //         console.log('   - ISRC + metadata search:', ytSearch.loadType, 'tracks:', ytSearch.data?.length || 0);
        //     }
            
        //     if (ytSearch && ytSearch.loadType === LoadType.SEARCH && ytSearch.data.length > 0) {
        //         trackData = ytSearch.data[0];
        //         console.log('✅ Converted to YouTube via ISRC:', trackData.info.title, 'by', trackData.info.author);
        //         console.log('   - Source:', trackData.info.sourceName);
        //     } else {
        //         console.log('⚠️ ISRC search failed, trying title search...');
        //         const titleSearch = await node.rest.resolve(`ytsearch:${trackData.info.title} ${trackData.info.author}`);
        //         if (titleSearch.loadType === LoadType.SEARCH && titleSearch.data.length > 0) {
        //             trackData = titleSearch.data[0];
        //             console.log('✅ Converted via title:', trackData.info.title);
        //         }
        //     }
        // }
        
        const track = player.buildTrack(trackData, ctx.author);
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
