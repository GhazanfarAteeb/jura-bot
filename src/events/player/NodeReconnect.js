import Event from "../../structures/Event.js";
import BotLog from "../../utils/BotLog.js";

export default class NodeReconnect extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "nodeReconnect",
    });
  }

  async run(node) {
    this.client.logger.warn(`Node ${node} reconnected`);
    BotLog.send(this.client, `Node ${node} reconnected`, "warn");
  }
};
