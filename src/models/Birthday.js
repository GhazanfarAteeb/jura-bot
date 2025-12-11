import mongoose from 'mongoose';

const birthdaySchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    guildId: {
        type: String,
        required: true
    },
    username: String,
    
    // Birthday information
    birthday: {
        month: { type: Number, required: true, min: 1, max: 12 },
        day: { type: Number, required: true, min: 1, max: 31 },
        year: Number // Optional - for age calculation
    },
    
    // Display preferences
    displayBirthday: {
        type: Boolean,
        default: true
    },
    showAge: {
        type: Boolean,
        default: false
    },
    customMessage: String, // Custom birthday message
    
    // Privacy settings
    isActualBirthday: {
        type: Boolean,
        default: true // User can mark if it's their real birthday
    },
    publiclyVisible: {
        type: Boolean,
        default: true
    },
    
    // Notifications
    lastCelebrated: Date,
    notificationSent: {
        type: Boolean,
        default: false
    },
    
    // Custom celebration settings
    celebrationPreference: {
        type: String,
        enum: ['public', 'dm', 'role', 'none'],
        default: 'public'
    }
}, {
    timestamps: true
});

// Compound index
birthdaySchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Method to check if birthday is today
birthdaySchema.methods.isBirthdayToday = function() {
    const today = new Date();
    return this.birthday.month === today.getMonth() + 1 && 
           this.birthday.day === today.getDate();
};

// Method to calculate age
birthdaySchema.methods.getAge = function() {
    if (!this.birthday.year) return null;
    
    const today = new Date();
    let age = today.getFullYear() - this.birthday.year;
    
    // Adjust if birthday hasn't occurred this year yet
    if (today.getMonth() + 1 < this.birthday.month || 
        (today.getMonth() + 1 === this.birthday.month && today.getDate() < this.birthday.day)) {
        age--;
    }
    
    return age;
};

// Static method to get today's birthdays
birthdaySchema.statics.getTodaysBirthdays = async function(guildId) {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();
    
    return await this.find({
        guildId,
        displayBirthday: true,
        'birthday.month': month,
        'birthday.day': day
    });
};

// Static method to get upcoming birthdays (next 7 days)
birthdaySchema.statics.getUpcomingBirthdays = async function(guildId, days = 7) {
    const birthdays = await this.find({ guildId, displayBirthday: true });
    const today = new Date();
    const upcoming = [];
    
    for (const birthday of birthdays) {
        const thisYear = today.getFullYear();
        const birthdayDate = new Date(thisYear, birthday.birthday.month - 1, birthday.birthday.day);
        
        // If birthday already passed this year, check next year
        if (birthdayDate < today) {
            birthdayDate.setFullYear(thisYear + 1);
        }
        
        const daysUntil = Math.floor((birthdayDate - today) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= days) {
            upcoming.push({
                birthday,
                daysUntil
            });
        }
    }
    
    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
};

export default mongoose.model('Birthday', birthdaySchema);
