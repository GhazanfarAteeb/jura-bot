import { Events } from 'discord.js';

export default {
    name: Events.InviteCreate,
    async execute(invite, client) {
        // Update invite cache
        const guildInvites = client.invites.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        client.invites.set(invite.guild.id, guildInvites);
    }
};
