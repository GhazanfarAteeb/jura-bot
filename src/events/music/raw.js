/**
 * Raw Event Handler for Riffy
 * Required to update voice state for Lavalink
 */

import Event from "../../structures/Event.js";
import { GatewayDispatchEvents } from "discord.js";

class RawEvent extends Event {
  constructor(client, file) {
    super(client, file, {
      name: "raw",
    });
  }

  async run(data) {
    // Only handle voice state and voice server updates
    if (
      ![
        GatewayDispatchEvents.VoiceStateUpdate,
        GatewayDispatchEvents.VoiceServerUpdate,
      ].includes(data.t)
    ) {
      return;
    }

    // For VOICE_SERVER_UPDATE, check if endpoint exists
    // Discord sometimes sends this without endpoint during region changes
    if (data.t === GatewayDispatchEvents.VoiceServerUpdate) {
      if (!data.d?.endpoint) {
        return;
      }
    }

    // Update Riffy's voice state with error handling
    if (this.client.riffy) {
      try {
        await this.client.riffy.updateVoiceState(data);
      } catch (error) {
        console.error(`[Music] Error updating voice state:`, error.message);
      }
    }
  }
}

export default RawEvent;
