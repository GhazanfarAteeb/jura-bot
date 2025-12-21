import logger from '../../utils/logger.js';

export default {
  name: 'nodeConnect',
  async execute(client, node) {
    console.log("\n---------------------");
    logger.info(`Node ${node.name} has connected.`);
    console.log("---------------------");
  }
};
