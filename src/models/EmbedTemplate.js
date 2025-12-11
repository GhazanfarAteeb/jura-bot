import mongoose from 'mongoose';

const embedTemplateSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    
    // Embed configuration
    embed: {
        title: String,
        description: String,
        color: { type: String, default: '#5865F2' },
        url: String,
        
        // Author section
        author: {
            name: String,
            iconUrl: String,
            url: String,
            useUserAvatar: { type: Boolean, default: false },
            useUserName: { type: Boolean, default: false }
        },
        
        // Thumbnail and images
        thumbnail: {
            url: String,
            useUserAvatar: { type: Boolean, default: false }
        },
        image: {
            url: String
        },
        
        // Fields
        fields: [{
            name: { type: String, required: true },
            value: { type: String, required: true },
            inline: { type: Boolean, default: false }
        }],
        
        // Footer
        footer: {
            text: String,
            iconUrl: String,
            useUserAvatar: { type: Boolean, default: false },
            useBotAvatar: { type: Boolean, default: false }
        },
        
        // Timestamp
        timestamp: { type: Boolean, default: true }
    },
    
    // Message content (outside embed)
    content: String,
    
    // Variables that can be used in the embed
    // {user} - user mention
    // {user.name} - username
    // {user.tag} - user#discriminator
    // {user.id} - user ID
    // {server} - server name
    // {server.members} - member count
    // {channel} - channel mention
    // {date} - current date
    // {time} - current time
    
    // Metadata
    createdBy: String, // User ID
    usageCount: { type: Number, default: 0 },
    lastUsed: Date,
    category: { type: String, enum: ['welcome', 'announcement', 'rules', 'info', 'custom'], default: 'custom' }
}, {
    timestamps: true
});

// Compound index
embedTemplateSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Method to replace variables in text
embedTemplateSchema.methods.replaceVariables = function(text, data = {}) {
    if (!text) return text;
    
    let result = text;
    
    // User variables
    if (data.user) {
        result = result.replace(/{user}/g, data.user.toString());
        result = result.replace(/{user\.mention}/g, data.user.toString());
        result = result.replace(/{user\.name}/g, data.user.username || 'Unknown');
        result = result.replace(/{user\.displayName}/g, data.user.displayName || data.user.username || 'Unknown');
        result = result.replace(/{user\.tag}/g, data.user.tag || 'Unknown');
        result = result.replace(/{user\.id}/g, data.user.id || 'Unknown');
    }
    
    // Server variables
    if (data.guild) {
        result = result.replace(/{server}/g, data.guild.name || 'Unknown');
        result = result.replace(/{server\.name}/g, data.guild.name || 'Unknown');
        result = result.replace(/{server\.members}/g, data.guild.memberCount?.toString() || '0');
        result = result.replace(/{server\.id}/g, data.guild.id || 'Unknown');
    }
    
    // Channel variables
    if (data.channel) {
        result = result.replace(/{channel}/g, data.channel.toString());
        result = result.replace(/{channel\.name}/g, data.channel.name || 'Unknown');
        result = result.replace(/{channel\.id}/g, data.channel.id || 'Unknown');
    }
    
    // Date/Time variables
    const now = new Date();
    result = result.replace(/{date}/g, now.toLocaleDateString());
    result = result.replace(/{time}/g, now.toLocaleTimeString());
    result = result.replace(/{datetime}/g, now.toLocaleString());
    
    return result;
};

// Method to build Discord embed with variable replacement
embedTemplateSchema.methods.buildEmbed = function(data = {}) {
    const embedData = {};
    
    // Basic properties
    if (this.embed.title) embedData.title = this.replaceVariables(this.embed.title, data);
    if (this.embed.description) embedData.description = this.replaceVariables(this.embed.description, data);
    if (this.embed.color) embedData.color = parseInt(this.embed.color.replace('#', ''), 16);
    if (this.embed.url) embedData.url = this.embed.url;
    
    // Author
    if (this.embed.author) {
        embedData.author = {};
        
        if (this.embed.author.useUserName && data.user) {
            embedData.author.name = data.user.displayName || data.user.username;
        } else if (this.embed.author.name) {
            embedData.author.name = this.replaceVariables(this.embed.author.name, data);
        }
        
        if (this.embed.author.useUserAvatar && data.user) {
            embedData.author.icon_url = data.user.displayAvatarURL({ dynamic: true });
        } else if (this.embed.author.iconUrl) {
            embedData.author.icon_url = this.embed.author.iconUrl;
        }
        
        if (this.embed.author.url) {
            embedData.author.url = this.embed.author.url;
        }
    }
    
    // Thumbnail
    if (this.embed.thumbnail) {
        if (this.embed.thumbnail.useUserAvatar && data.user) {
            embedData.thumbnail = { url: data.user.displayAvatarURL({ dynamic: true, size: 256 }) };
        } else if (this.embed.thumbnail.url) {
            embedData.thumbnail = { url: this.embed.thumbnail.url };
        }
    }
    
    // Image
    if (this.embed.image?.url) {
        embedData.image = { url: this.embed.image.url };
    }
    
    // Fields
    if (this.embed.fields && this.embed.fields.length > 0) {
        embedData.fields = this.embed.fields.map(field => ({
            name: this.replaceVariables(field.name, data),
            value: this.replaceVariables(field.value, data),
            inline: field.inline
        }));
    }
    
    // Footer
    if (this.embed.footer) {
        embedData.footer = {};
        
        if (this.embed.footer.text) {
            embedData.footer.text = this.replaceVariables(this.embed.footer.text, data);
        }
        
        if (this.embed.footer.useUserAvatar && data.user) {
            embedData.footer.icon_url = data.user.displayAvatarURL({ dynamic: true, size: 64 });
        } else if (this.embed.footer.useBotAvatar && data.client) {
            embedData.footer.icon_url = data.client.user.displayAvatarURL({ dynamic: true, size: 64 });
        } else if (this.embed.footer.iconUrl) {
            embedData.footer.icon_url = this.embed.footer.iconUrl;
        }
    }
    
    // Timestamp
    if (this.embed.timestamp) {
        embedData.timestamp = new Date().toISOString();
    }
    
    return embedData;
};

export default mongoose.model('EmbedTemplate', embedTemplateSchema);
