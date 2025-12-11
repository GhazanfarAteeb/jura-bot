import { Events } from 'discord.js';

export default {
    name: Events.InviteDelete,
    async execute(invite, client) {
        // Remove from invite cache
        const guildInvites = client.invites.get(invite.guild.id);
        if (guildInvites) {
            guildInvites.delete(invite.code);
        }
    }
};
