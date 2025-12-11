# GitHub Actions Auto-Deploy Setup

This workflow automatically deploys your bot to EC2 when you push to the `master` branch.

## Setup Instructions

### 1. Get Your EC2 SSH Key

On your local machine where you have the `.pem` key file:

```bash
# Display the private key content
cat your-key-name.pem
```

Copy the entire content (including `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----`)

### 2. Add GitHub Secrets

Go to your GitHub repository:
1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Add these three secrets:

**Secret 1: EC2_HOST**
- Name: `EC2_HOST`
- Value: Your EC2 public IP or hostname (e.g., `3.12.34.56` or `ec2-3-12-34-56.compute-1.amazonaws.com`)

**Secret 2: EC2_USERNAME**
- Name: `EC2_USERNAME`
- Value: `ec2-user` (for Amazon Linux 2023)

**Secret 3: EC2_SSH_KEY**
- Name: `EC2_SSH_KEY`
- Value: Paste the entire content of your `.pem` file

### 3. Test the Workflow

Push a commit to master:

```bash
git add .
git commit -m "Add auto-deploy workflow"
git push origin master
```

Or trigger manually:
1. Go to **Actions** tab in GitHub
2. Click **Deploy to EC2**
3. Click **Run workflow**

### 4. Monitor Deployment

- Check the **Actions** tab to see deployment progress
- View logs to debug any issues
- Bot will automatically restart on EC2 after successful deployment

## How It Works

1. **Trigger**: Runs on every push to `master` branch
2. **SSH Connection**: Connects to your EC2 instance using stored credentials
3. **Update Code**: Pulls latest changes from GitHub
4. **Install Dependencies**: Runs `npm install --production`
5. **Restart Bot**: Restarts PM2 process or starts if not running
6. **Save State**: Saves PM2 configuration for auto-restart on reboot

## Manual Deployment Commands

If you need to deploy manually via SSH:

```bash
ssh -i your-key.pem ec2-user@your-ec2-ip
cd ~/jura-bot
git pull
npm install
pm2 restart jura-bot
```

## Troubleshooting

**Deployment fails with "Permission denied":**
- Make sure your SSH key is correct in GitHub Secrets
- Verify EC2 security group allows SSH (port 22) from GitHub IPs

**Bot doesn't restart:**
- SSH into EC2 and check: `pm2 logs jura-bot`
- Verify .env file exists: `ls -la ~/jura-bot/.env`

**Dependencies fail to install:**
- Check disk space: `df -h`
- Clear npm cache: `npm cache clean --force`
