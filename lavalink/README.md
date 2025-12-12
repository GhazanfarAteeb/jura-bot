# Lavalink Server Setup

## Quick Setup on Your Server

### 1. Upload Configuration
Upload `application.yml` to your server's `~/lavalink/` directory:
```bash
scp lavalink/application.yml your-server:~/lavalink/
```

### 2. Restart Lavalink
SSH into your server and restart Lavalink:
```bash
cd ~/lavalink
pm2 stop lavalink
pm2 start lavalink
pm2 logs lavalink
```

### 3. Update Bot Configuration
Update your `.env` file with your server details:
```env
LAVALINK_HOST=your-server-ip-or-domain
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
```

### 4. Restart Bot
```bash
pm2 restart jura-bot
```

## Important Notes

### LavaSrc Plugin
The configuration includes the **LavaSrc plugin** which is essential for:
- YouTube playback (bypasses Google restrictions)
- Spotify to YouTube conversion
- Better audio source handling

### Firewall Configuration
Make sure port 2333 is open on your server:
```bash
# For AWS EC2 Security Group
# Add inbound rule: TCP port 2333 from your bot server's IP

# For UFW (Ubuntu)
sudo ufw allow 2333/tcp
```

### Verify Lavalink is Running
```bash
# Check if Lavalink is running
pm2 status

# Check logs
pm2 logs lavalink

# Test connection
curl http://localhost:2333/version
```

## Troubleshooting

### No Audio / loadFailed Error
1. Check Lavalink logs: `pm2 logs lavalink`
2. Verify plugins loaded: Look for "LavaSrc" in startup logs
3. Test API: `curl http://localhost:2333/v4/stats -H "Authorization: youshallnotpass"`

### Connection Issues
1. Verify firewall allows port 2333
2. Check if Lavalink is running: `pm2 status`
3. Check bot can reach server: From bot server, run `telnet your-lavalink-server 2333`

### Plugin Not Loading
If LavaSrc doesn't load:
```bash
cd ~/lavalink
# Check if plugins directory exists
ls -la plugins/
# Manually download if needed
mkdir -p plugins
cd plugins
wget https://github.com/topi314/LavaSrc/releases/download/4.2.0/lavasrc-plugin-4.2.0.jar
cd ..
pm2 restart lavalink
```

## Performance Optimization

### Increase Memory (if needed)
Edit `lavalink.config.js`:
```javascript
args: ['-Xmx2G', '-jar', 'Lavalink.jar'],  // Changed from 1G to 2G
```

Then: `pm2 restart lavalink`
