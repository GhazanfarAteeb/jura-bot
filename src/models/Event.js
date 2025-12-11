import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    creatorId: {
        type: String,
        required: true
    },
    creatorTag: String,
    
    // Event details
    title: {
        type: String,
        required: true
    },
    description: String,
    eventDate: {
        type: Date,
        required: true
    },
    
    // Notification settings
    notifyBefore: {
        type: Number,
        default: 30 // minutes before event
    },
    notificationRoles: [String], // Role IDs to notify
    notificationChannel: String,
    
    // Event status
    status: {
        type: String,
        enum: ['scheduled', 'notified', 'started', 'completed', 'cancelled'],
        default: 'scheduled'
    },
    
    // Reminders sent
    reminders: [{
        sentAt: Date,
        minutesBefore: Number
    }],
    
    // Participants
    participants: [{
        userId: String,
        username: String,
        joinedAt: { type: Date, default: Date.now }
    }],
    
    // Recurring event
    recurring: {
        enabled: { type: Boolean, default: false },
        interval: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'], default: 'weekly' }
    },
    
    // Additional settings
    color: String,
    imageUrl: String,
    location: String, // Voice channel ID or text location
    maxParticipants: Number
}, {
    timestamps: true
});

// Index for efficient queries
eventSchema.index({ guildId: 1, eventDate: 1 });
eventSchema.index({ guildId: 1, status: 1 });

// Method to check if event is happening soon
eventSchema.methods.isHappeningSoon = function(minutes = 30) {
    const now = Date.now();
    const eventTime = this.eventDate.getTime();
    const diffMinutes = (eventTime - now) / (1000 * 60);
    
    return diffMinutes > 0 && diffMinutes <= minutes;
};

// Method to check if reminder should be sent
eventSchema.methods.shouldSendReminder = function() {
    const now = Date.now();
    const eventTime = this.eventDate.getTime();
    const diffMinutes = (eventTime - now) / (1000 * 60);
    
    // Check if we're within the notification window
    if (diffMinutes <= this.notifyBefore && diffMinutes > 0) {
        // Check if we haven't sent a reminder for this time window yet
        const alreadySent = this.reminders.some(r => 
            r.minutesBefore === this.notifyBefore
        );
        return !alreadySent;
    }
    
    return false;
};

// Static method to get upcoming events
eventSchema.statics.getUpcomingEvents = async function(guildId, hours = 24) {
    const now = new Date();
    const futureDate = new Date(now.getTime() + hours * 60 * 60 * 1000);
    
    return await this.find({
        guildId,
        status: { $in: ['scheduled', 'notified'] },
        eventDate: {
            $gte: now,
            $lte: futureDate
        }
    }).sort({ eventDate: 1 });
};

// Static method to get events needing notifications
eventSchema.statics.getEventsNeedingNotification = async function() {
    const now = new Date();
    
    return await this.find({
        status: 'scheduled',
        eventDate: { $gte: now }
    });
};

export default mongoose.model('Event', eventSchema);
