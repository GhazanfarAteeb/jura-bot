import mongoose from 'mongoose';

// Music Schema - handles all music bot data
const musicSchema = new mongoose.Schema({
  // Identifier fields
  guildId: { type: String, index: true },
  userId: { type: String, index: true },
  roleId: { type: String },
  
  // Type discriminator
  type: { 
    type: String, 
    required: true,
    enum: ['guild', 'stay', 'dj', 'role', 'botchannel', 'setup', 'user', 'playlist', 'premium'],
    index: true
  },
  
  // Guild settings
  prefix: { type: String },
  
  // 24/7 mode settings
  textId: { type: String },
  voiceId: { type: String },
  
  // DJ mode
  mode: { type: Boolean, default: false },
  
  // Setup data
  messageId: { type: String },
  
  // Playlist data
  playlist: {
    name: { type: String },
    songs: [{ type: String }]
  }
}, {
  timestamps: true,
  collection: 'music'
});

// Compound indexes for better query performance
musicSchema.index({ guildId: 1, type: 1 });
musicSchema.index({ userId: 1, type: 1 });
musicSchema.index({ userId: 1, 'playlist.name': 1 });

export default mongoose.model('Music', musicSchema);
