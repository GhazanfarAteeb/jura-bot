import Command from '../../structures/Command.js';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import logger from '../../utils/logger.js';

export default class Player extends Command {
  constructor(client) {
    super(client, {
      name: 'player',
      description: 'Shows an interactive music player with controls',
      usage: 'player',
      category: 'Music',
      aliases: ['np', 'nowplaying']
    });
  }

  async run(client, ctx, args) {
    const message = ctx.message;
    logger.info(`[Player Command] Executed by ${message.author.tag} in guild ${message.guild.id}`);

    const queue = this.client.music.queues.get(message.guild.id);
    if (!queue || !queue.current) {
      logger.warn(`[Player Command] No music playing in guild ${message.guild.id}`);
      return message.reply('Nothing is currently playing!');
    }

    logger.info(`[Player Command] Displaying player for "${queue.current.info.title}" in guild ${message.guild.id}`);

    // Create the player embed and buttons
    const { embed, components } = this.createPlayerView(queue);

    const playerMessage = await message.reply({ embeds: [embed], components });
    logger.info(`[Player Command] Player message sent in guild ${message.guild.id}`);

    // Set up button interaction collector
    const collector = playerMessage.createMessageComponentCollector({
      filter: (i) => i.user.id === message.author.id,
      time: 300000 // 5 minutes
    });

    collector.on('collect', async (interaction) => {
      const buttonId = interaction.customId;
      logger.info(`[Player Command] Button clicked: ${buttonId} by ${interaction.user.tag} in guild ${message.guild.id}`);

      try {
        await interaction.deferUpdate();

        switch (buttonId) {
          case 'player_previous':
            // Previous track logic - not implemented yet, would need to track history
            logger.info(`[Player Command] Previous button clicked - feature not implemented`);
            await interaction.followUp({ content: '⏮️ Previous track feature coming soon!', ephemeral: true });
            break;

          case 'player_pause':
            if (queue.paused) {
              queue.pause(false);
              logger.info(`[Player Command] Resumed playback in guild ${message.guild.id}`);
              await interaction.followUp({ content: '▶️ Resumed!', ephemeral: true });
            } else {
              queue.pause(true);
              logger.info(`[Player Command] Paused playback in guild ${message.guild.id}`);
              await interaction.followUp({ content: '⏸️ Paused!', ephemeral: true });
            }
            break;

          case 'player_stop':
            logger.info(`[Player Command] Stop button clicked in guild ${message.guild.id}`);
            queue.destroy();
            await interaction.followUp({ content: '⏹️ Stopped and disconnected!', ephemeral: true });
            collector.stop();
            break;

          case 'player_skip':
            logger.info(`[Player Command] Skip button clicked in guild ${message.guild.id}`);
            if (queue.queue.length > 0) {
              queue.skip();
              await interaction.followUp({ content: '⏭️ Skipped to next track!', ephemeral: true });
            } else {
              await interaction.followUp({ content: 'No more tracks in queue!', ephemeral: true });
            }
            break;

          case 'player_refresh':
            logger.info(`[Player Command] Refresh button clicked in guild ${message.guild.id}`);
            const { embed: newEmbed, components: newComponents } = this.createPlayerView(queue);
            await playerMessage.edit({ embeds: [newEmbed], components: newComponents });
            await interaction.followUp({ content: '🔄 Refreshed!', ephemeral: true });
            break;
        }

        // Update the player view after action
        if (buttonId !== 'player_stop' && buttonId !== 'player_refresh') {
          const { embed: updatedEmbed, components: updatedComponents } = this.createPlayerView(queue);
          await playerMessage.edit({ embeds: [updatedEmbed], components: updatedComponents });
        }

      } catch (error) {
        logger.error(`[Player Command] Error handling button interaction:`, error);
        await interaction.followUp({ content: 'An error occurred!', ephemeral: true });
      }
    });

    collector.on('end', () => {
      logger.info(`[Player Command] Collector ended for guild ${message.guild.id}`);
      // Disable buttons after timeout
      const disabledComponents = components.map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(button => {
          newRow.addComponents(
            ButtonBuilder.from(button).setDisabled(true)
          );
        });
        return newRow;
      });
      playerMessage.edit({ components: disabledComponents }).catch(() => {});
    });
  }

  createPlayerView(queue) {
    const current = queue.current;
    const position = queue.player?.position || 0;
    const duration = current.info.length;
    const paused = queue.paused;

    // Calculate progress
    const progressBar = this.createProgressBar(position, duration);
    const currentTime = this.formatTime(position);
    const totalTime = this.formatTime(duration);

    // Create embed
    const embed = this.client.embed()
      .setAuthor({ 
        name: paused ? '⏸️ Paused' : '▶️ Now Playing',
        iconURL: this.client.user.displayAvatarURL() 
      })
      .setTitle(current.info.title)
      .setURL(current.info.uri)
      .setThumbnail(current.info.artworkUrl || this.client.user.displayAvatarURL())
      .addFields(
        { name: '👤 Artist', value: current.info.author || 'Unknown', inline: true },
        { name: '⏱️ Duration', value: totalTime, inline: true },
        { name: '🔊 Volume', value: `${queue.volume || 80}%`, inline: true },
        { name: '🔁 Loop', value: queue.loop === 'none' ? 'Off' : queue.loop === 'track' ? 'Track' : 'Queue', inline: true },
        { name: '📝 Queue', value: `${queue.queue.length} track(s)`, inline: true },
        { name: '👤 Requested by', value: `<@${current.requester.id}>`, inline: true },
        { name: '\u200b', value: `${progressBar}\n\`${currentTime}\` / \`${totalTime}\``, inline: false }
      )
      .setColor(this.client.color.main)
      .setFooter({ text: `Source: ${current.info.sourceName || 'Unknown'}` })
      .setTimestamp();

    // Create buttons
    const row1 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('player_previous')
          .setLabel('Previous')
          .setEmoji('⏮️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true), // Disabled for now
        new ButtonBuilder()
          .setCustomId('player_pause')
          .setLabel(paused ? 'Resume' : 'Pause')
          .setEmoji(paused ? '▶️' : '⏸️')
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId('player_stop')
          .setLabel('Stop')
          .setEmoji('⏹️')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('player_skip')
          .setLabel('Skip')
          .setEmoji('⏭️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(queue.queue.length === 0)
      );

    const row2 = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('player_refresh')
          .setLabel('Refresh')
          .setEmoji('🔄')
          .setStyle(ButtonStyle.Success)
      );

    return { embed, components: [row1, row2] };
  }

  createProgressBar(current, total, length = 20) {
    const percentage = current / total;
    const progress = Math.round(length * percentage);
    const emptyProgress = length - progress;

    const progressBar = '▬'.repeat(progress) + '🔘' + '▬'.repeat(emptyProgress);
    return progressBar;
  }

  formatTime(ms) {
    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor(ms / (1000 * 60 * 60));

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
