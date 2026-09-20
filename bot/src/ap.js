import { randomUUID } from "node:crypto";

function toWsUrl(host, port) {
  const raw = (host ?? "").trim();
  const p = String(port ?? "").trim() || "38281";
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    if (/:\d+$/.test(raw) || raw.includes("/")) return raw;
    return `${raw}:${p}`;
  }
  const h = raw.replace(/\/$/, "") || "archipelago.gg";
  const local = h === "localhost" || h.endsWith(".local") || /^(\d+\.){3}\d+$/.test(h);
  const scheme = local ? "ws" : "wss";
  return `${scheme}://${h}:${p}`;
}

function flattenPrint(pkt) {
  if (typeof pkt.data === "string") return pkt.data;
  if (Array.isArray(pkt.data)) return pkt.data.map((part) => part.text ?? "").join("");
  return "";
}

export class ArchipelagoClient {
  constructor(handlers) {
    this.handlers = handlers;
    this.ws = null;
    this.locationNameToId = new Map();
    this.itemIdToName = new Map();
    this.itemNameToId = new Map();
    this.reconnectTimer = null;
    this.opts = null;
    this.shouldReconnect = false;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(opts) {
    this.disconnect(false);
    this.opts = opts;
    this.shouldReconnect = true;
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

      ws.addEventListener("error", () => fail("Could not reach the Archipelago server."));
      ws.addEventListener("close", () => {
        this.handlers.onStatus("disconnected");
        if (!settled) fail("Connection closed.");
        else this.scheduleReconnect();
      });
      ws.addEventListener("message", (ev) => {
        let packets = [];
        try {
          packets = JSON.parse(String(ev.data));
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

  handle(pkt, opts, onConnected, fail) {
    if (pkt.cmd === "RoomInfo") {
      this.send([
        { cmd: "GetDataPackage", games: pkt.games ?? [] },
        {
          cmd: "Connect",
          password: opts.password || "",
          game: opts.game,
          name: opts.slot,
          uuid: randomUUID(),
          version: { major: 0, minor: 6, build: 2, class: "Version" },
          items_handling: 0b111,
          tags: ["AP", "Needlecheck"],
          slot_data: true,
        },
      ]);
    } else if (pkt.cmd === "DataPackage") {
      const games = pkt.data?.games;
      if (games) {
        this.ingestPackage(games);
        this.handlers.onDataPackage?.(games);
      }
    } else if (pkt.cmd === "Connected") {
      this.handlers.onStatus("connected");
      onConnected();
      this.handlers.onConnected({
        slot: pkt.slot,
        checked: pkt.checked_locations ?? [],
        missing: pkt.missing_locations ?? [],
        players: (pkt.players ?? []).map((p) => ({ name: p.name, alias: p.alias, slot: p.slot })),
      });
    } else if (pkt.cmd === "ConnectionRefused") {
      const errors = pkt.errors ?? ["refused"];
      fail(errors.join(", "));
    } else if (pkt.cmd === "ReceivedItems") {
      this.handlers.onItems(pkt.items ?? [], pkt.index ?? 0);
    } else if (pkt.cmd === "PrintJSON") {
      const text = flattenPrint(pkt);
      if (text) this.handlers.onPrint(text);
    } else if (pkt.cmd === "RoomUpdate") {
      const checked = pkt.checked_locations;
      if (checked?.length) this.handlers.onChecked(checked);
    }
  }

  checkLocations(ids) {
    if (!ids.length || !this.connected) return;
    this.send([{ cmd: "LocationChecks", locations: ids }]);
  }

  say(text) {
    if (!this.connected || !text.trim()) return;
    this.send([{ cmd: "Say", text: text.trim() }]);
  }

  disconnect(stopReconnect = true) {
    if (stopReconnect) this.shouldReconnect = false;
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

  ingestPackage(games) {
    for (const g of Object.values(games)) {
      for (const [name, id] of Object.entries(g.location_name_to_id ?? {})) this.locationNameToId.set(name, id);
      for (const [name, id] of Object.entries(g.item_name_to_id ?? {})) {
        this.itemNameToId.set(name, id);
        this.itemIdToName.set(id, name);
      }
    }
  }

  send(packets) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(packets));
  }
}
