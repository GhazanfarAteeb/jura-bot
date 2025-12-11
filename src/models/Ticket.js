import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    ticketNumber: {
        type: Number,
        required: true
    },
    channelId: String,
    
    // User info
    userId: {
        type: String,
        required: true
    },
    username: String,
    
    // Ticket details
    category: {
        type: String,
        default: 'general'
    },
    subject: String,
    status: {
        type: String,
        enum: ['open', 'claimed', 'closed', 'archived'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    
    // Staff assignment
    claimedBy: String,
    claimedByTag: String,
    claimedAt: Date,
    
    // Participants
    participants: [String], // User IDs with access
    
    // Messages
    messages: [{
        authorId: String,
        authorTag: String,
        content: String,
        timestamp: { type: Date, default: Date.now },
        attachments: [String]
    }],
    
    // Closure info
    closedBy: String,
    closedByTag: String,
    closedAt: Date,
    closeReason: String,
    
    // Transcript
    transcriptUrl: String,
    
    // Ratings
    rating: {
        score: Number, // 1-5
        feedback: String,
        ratedAt: Date
    }
}, {
    timestamps: true
});

// Compound index
ticketSchema.index({ guildId: 1, ticketNumber: 1 }, { unique: true });
ticketSchema.index({ guildId: 1, status: 1 });

// Get next ticket number
ticketSchema.statics.getNextTicketNumber = async function(guildId) {
    const lastTicket = await this.findOne({ guildId })
        .sort({ ticketNumber: -1 })
        .limit(1);
    
    return lastTicket ? lastTicket.ticketNumber + 1 : 1;
};

// Add message to ticket
ticketSchema.methods.addMessage = function(authorId, authorTag, content, attachments = []) {
    this.messages.push({
        authorId,
        authorTag,
        content,
        attachments
    });
};

export default mongoose.model('Ticket', ticketSchema);
