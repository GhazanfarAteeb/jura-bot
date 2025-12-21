import Command from '../../structures/Command.js';
import { PermissionFlagsBits } from 'discord.js';

export default class Play extends Command {
  constructor(client) {
    super(client, {
      name: 'play',
      description: 'Play music from YouTube, Spotify, and more',
      usage: 'play <song name | URL>',
      category: 'Music',
      aliases: ['p'],
      cooldown: 3
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;

    // Check if user is in a voice channel
    const memberVoiceChannel = message.member.voice.channel;
    if (!memberVoiceChannel) {
      return message.reply('You need to be in a voice channel to play music!');
    }

    // Check bot permissions
    const permissions = memberVoiceChannel.permissionsFor(client.user);
    if (!permissions.has([PermissionFlagsBits.Connect, PermissionFlagsBits.Speak])) {
      return message.reply('I don\'t have permissions to join or speak in your voice channel!');
    }

    // Check if query is provided
    if (!args.length) {
      return message.reply('Please provide a song name or URL!');
    }

    const query = args.join(' ');

    try {
      // Create or get player
      const player = client.riffyManager.riffy.createConnection({
        guildId: message.guild.id,
        voiceChannel: memberVoiceChannel.id,
        textChannel: message.channel.id,
        deaf: true
      });

      // Search for tracks
      const resolve = await client.riffyManager.riffy.resolve({
        query: query,
        requester: message.member
      });

      const { loadType, tracks, playlistInfo } = resolve;

      if (loadType === 'playlist') {
        // Add all playlist tracks
        for (const track of tracks) {
          track.info.requester = message.member;
          player.queue.add(track);
        }

        await message.reply(`Added ${tracks.length} songs from ${playlistInfo.name} playlist.`);

        if (!player.playing && !player.paused) return player.play();

      } else if (loadType === 'search' || loadType === 'track') {
        // Add single track
        const track = tracks.shift();
        track.info.requester = message.member;
        player.queue.add(track);

        await message.reply(`Added **${track.info.title}** to the queue.`);

        if (!player.playing && !player.paused) return player.play();

      } else {
        return message.reply('There were no results found for your query.');
      }
    } catch (error) {
      console.error('Play command error:', error);
      return message.reply('An error occurred while trying to play music!');
    }
  }
}
