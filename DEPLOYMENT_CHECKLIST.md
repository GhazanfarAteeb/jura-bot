# ✅ Deployment Checklist - v2.1.0

## Pre-Deployment

### 1. Environment Variables
- [ ] `DISCORD_TOKEN` is set
- [ ] `CLIENT_ID` is set
- [ ] `MONGODB_URI` is set and tested
- [ ] `PORT` is set (default: 3000)
- [ ] `DEFAULT_PREFIX` is set (default: !)
- [ ] `SPOTIFY_CLIENT_ID` is set (for music)
- [ ] `SPOTIFY_CLIENT_SECRET` is set (for music)

### 2. Database Preparation
- [ ] MongoDB is running and accessible
- [ ] Database backup created
- [ ] Test connection with current URI
- [ ] Verify collections exist (guilds, members, economy)
- [ ] Check indexes are created

### 3. Dependencies
- [ ] Run `npm install` to install all dependencies
- [ ] Verify Node.js version is 18 or higher
- [ ] Check for any npm security vulnerabilities
- [ ] Update outdated packages if needed

### 4. File Verification
- [ ] All new command files exist in `src/commands/`
- [ ] All event files exist in `src/events/`
- [ ] `src/utils/gameConfig.js` is present
- [ ] `docs/commands.html` is created
- [ ] All markdown files are updated

---

## Code Review

### 5. Command Files (New)
- [ ] `src/commands/economy/adventure.js` ✓
- [ ] `src/commands/economy/rep.js` ✓
- [ ] `src/commands/economy/addcoins.js` ✓
- [ ] `src/commands/economy/coinflip.js` ✓
- [ ] `src/commands/economy/slots.js` ✓
- [ ] `src/commands/economy/dice.js` ✓
- [ ] `src/commands/economy/roulette.js` ✓
- [ ] `src/commands/economy/level.js` ✓
- [ ] `src/commands/config/setcoin.js` ✓
- [ ] `src/commands/utility/top.js` ✓
- [ ] `src/commands/utility/stats.js` ✓

### 6. Command Files (Updated)
- [ ] `src/commands/info/help.js` - Rewritten ✓
- [ ] `src/commands/economy/profile.js` - Added description ✓
- [ ] `src/commands/economy/setprofile.js` - Added fields ✓

### 7. Event Files (New)
- [ ] `src/events/guildCreate.js` ✓
- [ ] `src/events/statsMessageTracker.js` ✓
- [ ] `src/events/statsVoiceTracker.js` ✓

### 8. Model Files (Updated)
- [ ] `src/models/Economy.js` - New fields added ✓
- [ ] `src/models/Guild.js` - Economy config added ✓
- [ ] `src/models/Member.js` - Stats tracking added ✓

### 9. Utility Files (New)
- [ ] `src/utils/gameConfig.js` ✓

---

## Testing Phase

### 10. Help Command Testing
- [ ] Run `!help` - verify dropdown menu appears
- [ ] Select each category from dropdown
  - [ ] Configuration category
  - [ ] Moderation category
  - [ ] Economy category
  - [ ] Music category
  - [ ] Community category
  - [ ] Info category
  - [ ] Utility category
- [ ] Test `!help <command>` for 5 different commands
- [ ] Verify refresh button works
- [ ] Check timeout after 5 minutes

### 11. Economy Command Testing
- [ ] `!adventure` - Complete adventure, check cooldown
- [ ] `!adventure` - Try again before cooldown (should fail)
- [ ] `!rep @user` - Give reputation
- [ ] `!rep @user` - Try again (should fail - 24hr cooldown)
- [ ] `!rep @self` - Should fail (can't rep yourself)
- [ ] `!coinflip 100 heads` - Play and check balance update
- [ ] `!slots 100` - Play slot machine
- [ ] `!dice 100 3` - Roll dice
- [ ] `!roulette 100 red` - Spin roulette (color)
- [ ] `!roulette 100 17` - Spin roulette (number)
- [ ] `!top coins` - View coins leaderboard
- [ ] `!top rep` - View reputation leaderboard
- [ ] `!top level` - View level leaderboard
- [ ] `!addcoins @user 1000` - Award coins (admin only)
- [ ] `!setcoin emoji 🪙` - Change coin emoji
- [ ] `!setcoin name credits` - Change coin name
- [ ] `!setcoin` - View current settings

### 12. Profile Command Testing
- [ ] `!setprofile description Testing description` - Set description
- [ ] `!setprofile blurcolor rgba(0,0,0,0.7)` - Set blur color
- [ ] `!profile` - Check description appears
- [ ] `!level` - Verify description is NOT shown
- [ ] `!profile @otheruser` - View other user's profile

### 13. Statistics Command Testing
- [ ] `!stats` - Open stats interface
- [ ] Select dropdown: 1d, 7d, 14d, all-time
- [ ] Click Messages button
- [ ] Click Voice Activity button
- [ ] Click Top Channels button
- [ ] Click Refresh button
- [ ] Send some messages and verify tracking works
- [ ] Join voice channel and verify tracking works
- [ ] `!stats @user` - View other user's stats

### 14. Guild Join Testing
- [ ] Create test server
- [ ] Invite bot to test server
- [ ] Verify welcome message appears
- [ ] Check console logs for profile recording
- [ ] Verify member count is correct
- [ ] Check database for recorded profiles
- [ ] Test with server that has 100+ members (optional)

### 15. Conflict Testing
- [ ] Run `node verify-commands.js`
- [ ] Review output for any conflicts
- [ ] Check for duplicate command names
- [ ] Check for duplicate aliases
- [ ] Verify all commands have required fields

---

## Performance Testing

### 16. Database Performance
- [ ] Monitor MongoDB CPU usage during testing
- [ ] Check query response times
- [ ] Verify indexes are being used
- [ ] Test with high message volume (100+ messages/min)
- [ ] Test voice tracking with multiple users

### 17. Memory Usage
- [ ] Monitor Node.js memory usage
- [ ] Check for memory leaks after 1 hour runtime
- [ ] Verify voiceSessions Map is cleaned up
- [ ] Monitor during guild join on large server

### 18. Response Times
- [ ] Help command responds in < 1 second
- [ ] Economy commands respond in < 2 seconds
- [ ] Stats command responds in < 3 seconds
- [ ] Database queries complete in < 500ms
- [ ] Profile card generation in < 2 seconds

---

## Documentation Review

### 19. Markdown Files
- [ ] `CHANGELOG.md` - v2.1.0 section complete
- [ ] `README.md` - Features updated
- [ ] `COMMANDS.md` - All commands documented
- [ ] `POTENTIAL_ISSUES.md` - Created and reviewed
- [ ] `UPDATE_SUMMARY.md` - Created and complete
- [ ] `QUICK_REFERENCE.md` - Created with examples

### 20. HTML Documentation
- [ ] `docs/commands.html` - All categories present
- [ ] Search functionality works
- [ ] Category toggles work
- [ ] Responsive design on mobile
- [ ] All 73 commands listed

---

## Final Checks

### 21. Error Handling
- [ ] Try invalid commands - proper error messages
- [ ] Try commands without permissions - proper denial
- [ ] Try gambling with insufficient funds - proper error
- [ ] Try giving rep to bot - proper error
- [ ] Try adventure while on cooldown - proper error

### 22. Permission Checks
- [ ] Admin commands require Administrator
- [ ] Mod commands require proper permissions
- [ ] Economy commands work for everyone
- [ ] Config commands restricted properly

### 23. Cooldown System
- [ ] Adventure: 1 hour cooldown works
- [ ] Rep: 24 hour per-user cooldown works
- [ ] Gambling: 5 second cooldown works
- [ ] Stats: 10 second cooldown works
- [ ] Help: 5 second cooldown works

### 24. Edge Cases
- [ ] Bot with no economy data (fresh user)
- [ ] Guild with no configuration
- [ ] User with no stats history
- [ ] Empty leaderboards
- [ ] Very long descriptions (500 char limit)
- [ ] Invalid RGBA colors
- [ ] Negative coin amounts
- [ ] Amount exceeding maximum

---

## Deployment

### 25. Backup
- [ ] Create MongoDB backup
- [ ] Save current bot code version
- [ ] Document current bot status
- [ ] Note current uptime

### 26. Deploy
- [ ] Stop bot gracefully
- [ ] Pull latest code: `git pull origin master`
- [ ] Install dependencies: `npm install`
- [ ] Update environment variables if needed
- [ ] Start bot: `npm start`
- [ ] Verify bot comes online in Discord

### 27. Post-Deployment Monitoring
- [ ] Check bot status in Discord
- [ ] Monitor console logs for errors
- [ ] Test basic command: `!help`
- [ ] Test new features: `!adventure`, `!stats`
- [ ] Monitor for 30 minutes
- [ ] Check memory usage
- [ ] Verify database connections stable

---

## Rollback Plan (If Issues Occur)

### 28. Emergency Rollback
- [ ] Stop bot
- [ ] Revert to previous code version
- [ ] Restore database backup if needed
- [ ] Restart bot
- [ ] Verify functionality
- [ ] Document issue for investigation

---

## Post-Deployment Tasks

### 29. Announcements
- [ ] Announce new features in support server
- [ ] Update bot status if needed
- [ ] Post changelog in announcement channel
- [ ] Update bot description/website

### 30. Monitoring Setup
- [ ] Set up health check monitoring (Uptime Robot)
- [ ] Enable error logging
- [ ] Set up alerting for downtime
- [ ] Monitor command usage statistics

---

## Success Criteria

✅ **Deployment Successful If:**
- [ ] All 73 commands working
- [ ] Help command shows interactive menu
- [ ] Economy features functional
- [ ] Statistics tracking working
- [ ] Guild join profile recording working
- [ ] No critical errors in logs
- [ ] Database performing well
- [ ] Memory usage stable
- [ ] Bot responds quickly to commands

---

## Issue Tracking

**If issues found, document here:**

| Issue | Severity | Status | Notes |
|-------|----------|--------|-------|
| Example: Help menu not showing | High | ❌ Open | Fix in progress |
| | | | |
| | | | |

---

## Sign-Off

**Tested By:** _________________  
**Date:** _________________  
**Time:** _________________  
**Bot Version:** v2.1.0  
**Node Version:** _________________  
**Status:** ⬜ Pass / ⬜ Fail  

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Checklist Version:** 1.0  
**Last Updated:** December 11, 2025  
**Total Checklist Items:** 110
