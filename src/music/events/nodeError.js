import logger from '../../utils/logger.js';

export default {
  name: 'nodeError',
  async execute(client, node, error) {
    console.log("\n---------------------");
    logger.error(`Node ${node.name} encountered an error: ${error.message}`);
    console.log("---------------------");
  }
};
