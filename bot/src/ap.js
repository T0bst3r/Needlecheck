import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { toWsUrl } from "./url.js";

export { toWsUrl };

function flattenPrint(pkt) {
  if (typeof pkt.data === "string") return pkt.data;
  if (Array.isArray(pkt.data)) return pkt.data.map((part) => part.text ?? "").join("");
  return "";
}

export class ArchipelagoClient {
  constructor(handlers) {
    this.handlers = handlers;
    this.ws = null;
    this.reconnectTimer = null;
    this.opts = null;
    this.shouldReconnect = false;
    this.endpoint = "";
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(opts) {
    this.disconnect(false);
    this.opts = opts;
    this.shouldReconnect = true;
    this.endpoint = `${opts.host}:${opts.port || "38281"} · ${opts.slot}`;
    const url = toWsUrl(opts.host, opts.port);
    this.handlers.onStatus("connecting", url);

    await new Promise((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;

      const fail = (msg) => {
        if (settled) return;
        settled = true;
        this.handlers.onStatus("error", msg);
        reject(new Error(msg));
      };

      ws.on("error", (err) => {
        const code = err && err.code ? ` (${err.code})` : "";
        fail(`Could not reach ${url}. ${err?.message || "connection failed"}${code}`);
      });
      ws.on("close", () => {
        this.handlers.onStatus("disconnected");
        if (!settled) fail(`Connection to ${url} closed before the room answered.`);
        else this.scheduleReconnect();
      });
      ws.on("message", (data) => {
        let packets = [];
        try {
          packets = JSON.parse(String(data));
        } catch {
          return;
        }
        if (!Array.isArray(packets)) packets = [packets];
        for (const pkt of packets) this.handle(pkt, opts, () => {
          if (!settled) {
            settled = true;
            resolve();
          }
        }, fail);
      });
    });
  }

  handle(pkt, opts, resolveConnected, fail) {
    if (pkt.cmd === "RoomInfo") {
      this.send([
        { cmd: "GetDataPackage", games: pkt.games ?? [] },
        {
          cmd: "Connect",
          password: opts.password || "",
          game: opts.game || "Needlecheck",
          name: opts.slot,
          uuid: randomUUID(),
          version: { major: 0, minor: 6, build: 2, class: "Version" },
          items_handling: 0b111,
          tags: ["AP", "Needlecheck"],
          slot_data: true,
        },
      ]);
    } else if (pkt.cmd === "Connected") {
      try {
        this.handlers.onSlot?.(pkt.slot_data);
      } catch (err) {
        fail(err instanceof Error ? err.message : "The room sent a crate this bot cannot read.");
        this.disconnect(true);
        return;
      }
      this.handlers.onStatus("connected");
      this.handlers.onConnected?.({
        slot: pkt.slot,
        checked: pkt.checked_locations ?? [],
        missing: pkt.missing_locations ?? [],
        players: (pkt.players ?? []).map((p) => ({ name: p.name, alias: p.alias, slot: p.slot })),
      });
      resolveConnected();
    } else if (pkt.cmd === "ConnectionRefused") {
      const errors = pkt.errors ?? ["refused"];
      fail(errors.join(", "));
    } else if (pkt.cmd === "ReceivedItems") {
      this.handlers.onItems?.(pkt.items ?? [], pkt.index ?? 0);
    } else if (pkt.cmd === "PrintJSON") {
      const text = flattenPrint(pkt);
      if (text) this.handlers.onPrint?.(text);
    } else if (pkt.cmd === "RoomUpdate") {
      const checked = pkt.checked_locations;
      if (checked?.length) this.handlers.onChecked?.(checked);
    }
  }

  checkLocations(ids) {
    if (!ids.length || !this.connected) return;
    this.send([{ cmd: "LocationChecks", locations: ids }]);
  }

  disconnect(stopReconnect = true) {
    if (stopReconnect) {
      this.shouldReconnect = false;
      this.endpoint = "";
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
  }

  scheduleReconnect() {
    if (!this.shouldReconnect || !this.opts) return;
    this.reconnectTimer = setTimeout(() => {
      this.connect(this.opts).catch((err) => {
        this.handlers.onStatus("error", err.message);
        this.scheduleReconnect();
      });
    }, 5000);
  }

  send(packets) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(packets));
  }
}
