import Event from "../../structures/Event.js";
import BotLog from "../../utils/BotLog.js";

export default class NodeError extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "nodeError",
    });
  }

  async run(node, error) {
    this.client.logger.error(`Node ${node} Error: ${JSON.stringify(error)}`);
    BotLog.send(
      this.client,
      `Node ${node} Error: ${JSON.stringify(error)}`,
      "error"
    );
  }
};
