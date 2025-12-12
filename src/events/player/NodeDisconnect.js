import Event from "../../structures/Event.js";
import BotLog from "../../utils/BotLog.js";

export default class NodeDisconnect extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "nodeDisconnect",
    });
  }

  async run(node, count) {
    this.client.logger.warn(`Node ${node} disconnected ${count} times`);
    BotLog.send(
      this.client,
      `Node ${node} disconnected ${count} times`,
      "warn"
    );
  }
};
