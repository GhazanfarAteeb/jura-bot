import logger from '../../utils/logger.js';

export default {
  name: 'nodeError',
  async execute(client, node, error) {
    // Ignore NodeLink's custom events that Riffy doesn't recognize
    const ignoredEventErrors = [
      'PlayerCreatedEvent',
      'VolumeChangedEvent',
      'PlayerConnectedEvent',
      'PlayerDestroyedEvent',
      'PlayerPausedEvent',
      'PlayerResumedEvent'
    ];

    const errorMessage = error.message || '';
    
    // Skip logging if it's just an unknown NodeLink event
    if (ignoredEventErrors.some(event => errorMessage.includes(event))) {
      return;
    }

    // Log actual errors
    console.log("\n---------------------");
    logger.error(`Node ${node?.name || 'unknown'} encountered an error: ${errorMessage}`);
    console.log("---------------------");
  }
};
