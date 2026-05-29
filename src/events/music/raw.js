/**
 * Raw Event Handler — no-op
 *
 * moonlink.js Connectors.DiscordJs() registers its own client.on("raw", ...)
 * listener that forwards VOICE_STATE_UPDATE and VOICE_SERVER_UPDATE packets
 * to the manager automatically. Nothing needs to be done here.
 */

import Event from "../../structures/Event.js";

class RawEvent extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "raw",
    });
  }

  async run() {
    // Handled by moonlink.js Connector internally
  }
}

export default RawEvent;
