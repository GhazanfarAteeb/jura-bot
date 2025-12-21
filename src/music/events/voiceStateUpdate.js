import logger from '../../utils/logger.js';

export default {
  name: 'voiceStateUpdate',
  once: false,
  async execute(oldState, newState, client) {
    const riffyManager = client.riffyManager;
    if (!riffyManager) return;

    logger.info(`[VoiceStateUpdate] Voice state changed in guild ${oldState.guild.id}`);
    logger.info(`[VoiceStateUpdate] Member: ${oldState.member?.user?.tag || 'unknown'}, Left: ${oldState.channel?.id || 'none'}, Joined: ${newState.channel?.id || 'none'}`);

    const player = riffyManager.getPlayer(oldState.guild.id);
    if (!player) {
      logger.info(`[VoiceStateUpdate] No active player for guild ${oldState.guild.id}`);
      return;
    }

    // Get the voice channel the bot is in
    const botVoiceChannel = oldState.guild.members.cache.get(client.user.id)?.voice.channel;
    if (!botVoiceChannel) return;

    // If bot was disconnected
    if (oldState.id === client.user.id && !newState.channel) {
      logger.info(`[VoiceStateUpdate] Bot was disconnected from voice channel in guild ${oldState.guild.id}`);
      player.destroy();
      return;
    }

    // If bot was moved to a different channel
    if (oldState.id === client.user.id && oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
      logger.info(`[VoiceStateUpdate] Bot was moved from ${oldState.channel.name} to ${newState.channel.name} in guild ${oldState.guild.id}`);
      // Update player voice channel
      player.voiceChannel = newState.channel.id;
      logger.info(`[VoiceStateUpdate] Player voice channel updated to ${newState.channel.id}`);
      return;
    }

    // Auto-disconnect when alone in voice channel
    if (botVoiceChannel.members.size === 1 && botVoiceChannel.members.has(client.user.id)) {
      logger.info(`[VoiceStateUpdate] Bot is alone in voice channel ${botVoiceChannel.name}. Starting 60s timer in guild ${oldState.guild.id}`);

      // Wait 60 seconds before disconnecting
      setTimeout(async () => {
        const currentChannel = oldState.guild.members.cache.get(client.user.id)?.voice.channel;

        // Check if still alone
        if (currentChannel && currentChannel.members.size === 1) {
          logger.info(`[VoiceStateUpdate] Still alone after 60s. Disconnecting from guild ${oldState.guild.id}`);

          const textChannel = oldState.guild.channels.cache.get(player.textChannel);
          if (textChannel) {
            textChannel.send('👋 Left voice channel due to inactivity (no one was listening)').catch(() => { });
          }

          player.destroy();
          logger.info(`[VoiceStateUpdate] Player destroyed due to inactivity`);
        } else {
          logger.info(`[VoiceStateUpdate] Timer expired but members returned. Staying connected in guild ${oldState.guild.id}`);
        }
      }, 60000); // 60 seconds
    }
  }
};
