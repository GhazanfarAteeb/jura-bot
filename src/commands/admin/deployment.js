import logger from '../../utils/logger.js';

export default {
    name: 'deployment',
    description: 'Log deployment and build information',
    usage: 'deployment [start|complete|rollback]',
    category: 'admin',
    permissions: ['Administrator'],
    execute: async (message, args) => {
        const action = args[0]?.toLowerCase();
        
        if (!action || !['start', 'complete', 'rollback', 'status'].includes(action)) {
            return message.reply('Usage: `deployment [start|complete|rollback|status]`');
        }
        
        try {
            switch (action) {
                case 'start':
                    logger.deployment('Deployment started', {
                        initiatedBy: `${message.author.tag} (${message.author.id})`,
                        guild: `${message.guild.name} (${message.guild.id})`,
                        timestamp: new Date().toISOString(),
                        version: '2.1.0'
                    });
                    
                    await message.reply('✅ Deployment started and logged. Check logs directory for details.');
                    break;
                    
                case 'complete':
                    const version = args[1] || '2.1.0';
                    logger.deployment('Deployment completed successfully', {
                        version,
                        completedBy: `${message.author.tag} (${message.author.id})`,
                        guild: `${message.guild.name} (${message.guild.id})`,
                        timestamp: new Date().toISOString(),
                        status: 'success'
                    });
                    
                    await message.reply(`✅ Deployment v${version} completed and logged successfully.`);
                    break;
                    
                case 'rollback':
                    const previousVersion = args[1] || 'previous';
                    logger.deployment('Deployment rollback initiated', {
                        rollbackTo: previousVersion,
                        initiatedBy: `${message.author.tag} (${message.author.id})`,
                        guild: `${message.guild.name} (${message.guild.id})`,
                        timestamp: new Date().toISOString(),
                        reason: args.slice(2).join(' ') || 'No reason provided'
                    });
                    
                    await message.reply(`⚠️ Rollback to ${previousVersion} initiated and logged.`);
                    break;
                    
                case 'status':
                    const stats = logger.getStats();
                    
                    if (!stats) {
                        return message.reply('❌ Could not retrieve log statistics.');
                    }
                    
                    let response = '📊 **Deployment & Build Logs Status**\n\n';
                    response += `**Total Log Files:** ${stats.totalFiles}\n`;
                    response += `**Total Size:** ${stats.totalSize}\n\n`;
                    response += '**Logs by Type:**\n';
                    
                    for (const [type, data] of Object.entries(stats.filesByType)) {
                        const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
                        response += `• ${type}: ${data.count} file(s), ${sizeMB} MB\n`;
                    }
                    
                    await message.reply(response);
                    break;
            }
        } catch (error) {
            logger.error('Deployment command error', error);
            await message.reply('❌ An error occurred while processing the deployment command.');
        }
    }
};
