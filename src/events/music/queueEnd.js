/**
 * Music Queue End Event Handler
 * Handles when the queue is empty
 */

import Event from '../../structures/Event.js';
import { EmbedBuilder } from 'discord.js';

class MusicQueueEnd extends Event {
    constructor(client, file) {
        super(client, file, {
            name: 'musicQueueEnd'
        });
    }

    async run(player) {
        try {
            const channel = this.client.channels.cache.get(player.textChannel);

            // Delete the now playing message if exists
            if (player.message) {
                try {
                    await player.message.delete();
                    player.message = null;
                } catch (e) {
                    // Message already deleted
                }
            }

            // Check for autoplay
            if (player.isAutoplay) {
                player.autoplay(player);
                return;
            }

            // Send queue ended message
            if (channel) {
                const embed = new EmbedBuilder()
                    .setColor('#ffcc00')
                    .setTitle('📭 Queue Ended')
                    .setDescription('No more tracks in the queue. Add more songs or I\'ll disconnect.')
                    .setTimestamp();

                const msg = await channel.send({ embeds: [embed] });

                // Auto-delete message after 30 seconds
                setTimeout(() => {
                    msg.delete().catch(() => {});
                }, 30000);
            }

            // Destroy the player
            player.destroy();

        } catch (error) {
            this.client.logger.error('Error in musicQueueEnd event:', error);
        }
    }
}

export default MusicQueueEnd;
