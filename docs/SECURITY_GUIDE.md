# 🛡️ Server Security Guide - Preventing Server Nuking

## What is Server Nuking?
Server nuking is when someone with elevated permissions maliciously:
- Deletes all channels
- Deletes all roles
- Bans all members
- Destroys the server structure

## ✅ Your Bot's Built-in Protection

### 1. Anti-Nuke System (Already Implemented)
Located in: `src/events/client/antiNuke.js` and `src/commands/config/antinuke.js`

**Features:**
- ✅ Tracks suspicious mass actions (bans, kicks, role/channel deletions)
- ✅ Automatic response when thresholds are exceeded
- ✅ Whitelist trusted users
- ✅ Configurable actions: Remove Roles, Kick, or Ban
- ✅ Real-time alerts to staff and owner

**How to Enable:**
```
!antinuke enable
!antinuke config action ban
!antinuke whitelist add @TrustedAdmin
!antinuke whitelist remove @TrustedAdmin
!antinuke status
```

**Default Thresholds:**
- Channel Deletes: 3 in 10 seconds
- Role Deletes: 3 in 10 seconds
- Bans: 3 in 10 seconds
- Kicks: 5 in 10 seconds

---

## 🔒 Best Practices for Server Security

### 1. **Never Give Bot Administrator Permission**
Instead of granting `Administrator`, give only specific permissions:

**Required Bot Permissions:**
```
✅ View Channels
✅ Send Messages
✅ Embed Links
✅ Read Message History
✅ Add Reactions
✅ Manage Messages (for purge/moderation)
✅ Manage Roles (below bot's role)
✅ Kick Members
✅ Ban Members
✅ Moderate Members (timeout)
```

**Dangerous Permissions (Avoid giving these together):**
```
❌ Administrator (gives ALL permissions)
⚠️ Manage Server
⚠️ Manage Channels
⚠️ Manage Roles
⚠️ Manage Webhooks
```

### 2. **Role Hierarchy Matters**
```
Server Owner          (Highest)
├── Admin Role 1      ← Can't be modified by roles below
├── Admin Role 2
├── Moderator Role    ← Can't manage admin roles
├── Bot Role          ← Should be below admin roles
└── Member Role       (Lowest)
```

**Rules:**
- Bot can only manage roles below its own role
- Users can only manage roles below their highest role
- Keep bot role below trusted admin roles

### 3. **Limit Who Has Dangerous Permissions**
Only give these permissions to **absolutely trusted** people:
- `Administrator`
- `Manage Server`
- `Manage Roles`
- `Manage Channels`
- `Ban Members`

### 4. **Use Two-Factor Authentication (2FA)**
- Enable 2FA requirement for moderation
- Go to: Server Settings → Moderation → Require 2FA

### 5. **Configure Your Bot's Anti-Nuke**
```bash
# Enable anti-nuke protection
!antinuke enable

# Set action to ban suspicious users
!antinuke config action ban

# Set stricter limits
!antinuke config limit channelDelete 2
!antinuke config limit roleDelete 2
!antinuke config limit ban 2

# Whitelist trusted admins
!antinuke whitelist add @YourTrustedAdmin

# Remove someone from whitelist
!antinuke whitelist remove @User

# Check status
!antinuke status
```

### 6. **Regular Security Audits**
- Review who has dangerous permissions monthly
- Check bot role position
- Verify anti-nuke is enabled
- Review whitelisted users

### 7. **Backup Your Server**
Discord doesn't have built-in backups, but you can:
- Document your channel structure
- Save role configurations
- Keep a list of important settings
- Use backup bots (carefully!)

---

## 🚨 If Someone Gets Compromised

### Immediate Actions:
1. **Remove their roles immediately**
   - Right-click user → Edit Roles → Remove all dangerous roles

2. **Check Audit Log**
   - Server Settings → Audit Log
   - See what they did

3. **Enable Anti-Nuke if not already**
   ```
   !antinuke enable
   !antinuke config action ban
   ```

4. **Kick or ban the compromised account**
   ```
   !kick @user Account compromised
   !ban @user Account compromised
   ```

5. **Ask them to secure their account**
   - Change password
   - Enable 2FA
   - Check for unauthorized devices

---

## 📊 Monitoring Commands

### Check User Permissions
```
!userinfo @user
!roleinfo @RoleName
```

### Review Moderation Logs
```
!logs moderation
!userhistory @user
```

### Check Current Security Status
```
!antinuke status
!config
```

---

## ⚙️ Recommended Configuration

### Step 1: Setup Alert Channels
```
!setup            # Run initial setup
!logs moderation  # Set moderation log channel
```

### Step 2: Configure Anti-Nuke
```
!antinuke enable
!antinuke config action ban
!antinuke config timewindow 10
!antinuke whitelist add @ServerOwner
!antinuke whitelist add @TrustedAdmin
!antinuke whitelist remove @UntrustedUser
```

### Step 3: Setup Staff Roles
```
!setrole admin @AdminRole
!setrole moderator @ModRole
```

### Step 4: Enable Auto-Moderation
```
!automod enable
```

---

## 🔍 Red Flags to Watch For

### Suspicious Behavior:
- ⚠️ Mass channel deletions
- ⚠️ Mass role deletions
- ⚠️ Multiple rapid bans
- ⚠️ Sudden permission changes
- ⚠️ Unknown bots being added
- ⚠️ Webhook spam

### What Anti-Nuke Does:
When thresholds are exceeded:
1. **Detects** the suspicious activity
2. **Takes action** (removes roles/kicks/bans)
3. **Alerts** staff via configured log channel
4. **Notifies** server owner via DM
5. **Logs** the incident

---

## 💡 Trust Issues?

Based on your screenshot concern about "trust issues":

### Solution 1: Minimal Permissions
Don't give people permissions "just in case". Only give what they need:
- Moderators: Kick, Timeout, Manage Messages
- Events Manager: Manage Events only
- Support: No dangerous permissions

### Solution 2: Trial Period
- New moderators start with limited permissions
- Grant more permissions after proving trustworthy
- Use temporary permission assignments

### Solution 3: Accountability
- Enable all logging: `!logs moderation`
- Review audit log regularly
- Keep anti-nuke enabled
- Set stricter thresholds for new staff

### Solution 4: Multiple Safeguards
```
Layer 1: Proper Role Hierarchy
Layer 2: Limited Permissions
Layer 3: Anti-Nuke Protection
Layer 4: 2FA Requirement
Layer 5: Regular Audits
```

---

## 📝 Quick Setup Checklist

- [ ] Enable anti-nuke: `!antinuke enable`
- [ ] Configure action: `!antinuke config action ban`
- [ ] Whitelist trusted users
- [ ] Set up moderation logging
- [ ] Review all roles with dangerous permissions
- [ ] Enable 2FA requirement
- [ ] Position bot role correctly
- [ ] Remove unnecessary bot permissions
- [ ] Test anti-nuke with test account
- [ ] Inform staff about security measures

---

## ❓ Common Questions

**Q: Will anti-nuke trigger during legitimate mass bans?**
A: Whitelist the moderator first: `!antinuke whitelist add @Moderator`

**Q: What if the bot gets compromised?**
A: The bot has no Administrator permission and can only manage roles below it. Keep the bot's role below admin roles.

**Q: Can I trust new moderators?**
A: Start with minimal permissions, enable anti-nuke, and gradually increase permissions.

**Q: What's the best action setting?**
A: `ban` for maximum security, `removePerms` for trusted but potentially compromised accounts.

---

## 🆘 Emergency Contacts

If your server is being nuked:
1. Remove roles from the nuker immediately
2. Check anti-nuke status
3. Review audit log
4. Contact Discord support if needed

**Discord Support:** https://support.discord.com

---

## 📚 Additional Resources

- [Discord Permission Calculator](https://discordapi.com/permissions.html)
- [Discord Security Guide](https://discord.com/safety/360043857751-Four-steps-to-a-super-safe-server)
- Bot Command Reference: See `!help` or `docs/commands.html`

---

**Remember:** Prevention is better than recovery. Enable anti-nuke protection NOW!
