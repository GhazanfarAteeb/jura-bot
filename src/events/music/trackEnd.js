/**
 * Music Track End Event Handler
 * Cleans up messages when a track ends
 */

import Event from '../../structures/Event.js';

class MusicTrackEnd extends Event {
    constructor(client, file) {
        super(client, file, {
            name: 'musicTrackEnd'
        });
    }

    async run(player, track) {
        try {
            // Delete the now playing message
            if (player.message) {
                try {
                    await player.message.delete();
                    player.message = null;
                } catch (e) {
                    // Message already deleted
                }
            }
        } catch (error) {
            this.client.logger.error('Error in musicTrackEnd event:', error);
        }
    }
}

export default MusicTrackEnd;
