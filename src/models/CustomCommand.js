import mongoose from 'mongoose';

const customCommandSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    
    // Response
    response: {
        type: String,
        required: true
    },
    
    // Settings
    aliases: [String],
    description: String,
    
    // Permissions
    requiredRoles: [String],
    requiredPermissions: [String],
    
    // Usage restrictions
    allowedChannels: [String],
    disallowedChannels: [String],
    
    // Cooldown
    cooldown: {
        type: Number,
        default: 0 // seconds
    },
    
    // Response type
    responseType: {
        type: String,
        enum: ['text', 'embed', 'reaction'],
        default: 'text'
    },
    
    // Embed settings (if responseType is embed)
    embedSettings: {
        title: String,
        description: String,
        color: String,
        footer: String,
        imageUrl: String,
        thumbnailUrl: String,
        fields: [{
            name: String,
            value: String,
            inline: Boolean
        }]
    },
    
    // Stats
    useCount: {
        type: Number,
        default: 0
    },
    lastUsed: Date,
    
    // Creator
    createdBy: String,
    createdByTag: String,
    
    // Enabled
    enabled: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Compound index
customCommandSchema.index({ guildId: 1, name: 1 }, { unique: true });

// Increment use count
customCommandSchema.methods.incrementUseCount = function() {
    this.useCount++;
    this.lastUsed = new Date();
};

export default mongoose.model('CustomCommand', customCommandSchema);
