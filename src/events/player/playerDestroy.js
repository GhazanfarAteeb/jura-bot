import Event from '../../structures/Event.js';
import { updateSetup } from '../../utils/SetupSystem.js';

export default class PlayerDestroy extends Event {
    constructor(client, file) {
        super(client, file, {
            name: 'playerDestroy',
        });
    }

    async run(player) {
        const guild = this.client.guilds.cache.get(player.connection.guildId);
        if (!guild) return;
        
        await updateSetup(this.client, guild);
    }
}
