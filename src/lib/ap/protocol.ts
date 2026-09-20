export type NetworkVersion = {
  major: number;
  minor: number;
  build: number;
  class: "Version";
};

type Packet = { cmd: string; [key: string]: unknown };

export type LiveHandlers = {
  onStatus: (status: "connecting" | "connected" | "disconnected" | "error", detail?: string) => void;
  onItems: (items: Array<{ item: number; location: number; player: number; flags: number }>, index: number) => void;
  onPrint: (text: string) => void;
  onChecked: (locations: number[]) => void;
  onDataPackage: (games: Record<string, { location_name_to_id: Record<string, number>; item_name_to_id: Record<string, number> }>) => void;
  onConnected: (info: { slot: number; checked: number[]; missing: number[]; players: Array<{ name: string; alias: string; slot: number }> }) => void;
};

export function toWsUrl(host: string, port: string): string {
  const raw = host.trim();
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    if (raw.includes(":", 6) && !raw.match(/:\d+$/)) return raw;
    if (/\d+$/.test(raw) || raw.includes("/")) return raw;
    return `${raw}:${port.trim()}`;
  }
  const h = raw.replace(/\/$/, "") || "archipelago.gg";
  const p = port.trim() || "38281";
  const secure = h.includes("archipelago.gg") || h.includes(".");
  const scheme = secure ? "wss" : "ws";
  return `${scheme}://${h}:${p}`;
}

export class ArchipelagoClient {
  private ws: WebSocket | null = null;
  private handlers: LiveHandlers;
  locationNameToId = new Map<string, number>();
  itemIdToName = new Map<number, string>();
  itemNameToId = new Map<string, number>();

  constructor(handlers: LiveHandlers) {
    this.handlers = handlers;
  }

  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  async connect(opts: { host: string; port: string; slot: string; game: string; password: string }) {
    this.disconnect();
    const url = toWsUrl(opts.host, opts.port);
    this.handlers.onStatus("connecting", url);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);
      this.ws = ws;

      const fail = (msg: string) => {
        if (settled) return;
        settled = true;
        this.handlers.onStatus("error", msg);
        reject(new Error(msg));
      };

      ws.onerror = () => fail("Could not reach the Archipelago server.");
      ws.onclose = () => {
        this.handlers.onStatus("disconnected");
        if (!settled) fail("Connection closed.");
      };
      ws.onopen = () => {
        // wait for RoomInfo
      };
      ws.onmessage = (ev) => {
        let packets: Packet[] = [];
        try {
          packets = JSON.parse(String(ev.data)) as Packet[];
        } catch {
          return;
        }
        for (const pkt of packets) {
          if (pkt.cmd === "RoomInfo") {
            this.send([
              { cmd: "GetDataPackage", games: (pkt.games as string[]) ?? [] },
              {
                cmd: "Connect",
                password: opts.password || "",
                game: opts.game,
                name: opts.slot,
                uuid: crypto.randomUUID?.() ?? `${Date.now()}`,
                version: { major: 0, minor: 6, build: 2, class: "Version" } satisfies NetworkVersion,
                items_handling: 0b111,
                tags: ["AP", "Needlecheck"],
                slot_data: true,
              },
            ]);
          } else if (pkt.cmd === "DataPackage") {
            const g = (pkt.data as { games?: Record<string, { location_name_to_id: Record<string, number>; item_name_to_id: Record<string, number> }> } | undefined)
              ?.games;
            if (g) {
              this.ingestPackage(g);
              this.handlers.onDataPackage(g);
            }
          } else if (pkt.cmd === "Connected") {
            if (!settled) {
              settled = true;
              this.handlers.onStatus("connected");
              resolve();
            }
            this.handlers.onConnected({
              slot: pkt.slot as number,
              checked: (pkt.checked_locations as number[]) ?? [],
              missing: (pkt.missing_locations as number[]) ?? [],
              players: ((pkt.players as Array<{ name: string; alias: string; slot: number }>) ?? []).map((p) => ({
                name: p.name,
                alias: p.alias,
                slot: p.slot,
              })),
            });
          } else if (pkt.cmd === "ConnectionRefused") {
            const errors = (pkt.errors as string[]) ?? ["refused"];
            fail(errors.join(", "));
          } else if (pkt.cmd === "ReceivedItems") {
            const items = (pkt.items as Array<{ item: number; location: number; player: number; flags: number }>) ?? [];
            this.handlers.onItems(items, (pkt.index as number) ?? 0);
          } else if (pkt.cmd === "PrintJSON") {
            const text = flattenPrint(pkt);
            if (text) this.handlers.onPrint(text);
          } else if (pkt.cmd === "RoomUpdate") {
            const checked = pkt.checked_locations as number[] | undefined;
            if (checked?.length) this.handlers.onChecked(checked);
          }
        }
      };
    });
  }

  checkLocations(ids: number[]) {
    if (!ids.length || !this.connected) return;
    this.send([{ cmd: "LocationChecks", locations: ids }]);
  }

  say(text: string) {
    if (!this.connected || !text.trim()) return;
    this.send([{ cmd: "Say", text: text.trim() }]);
  }

  disconnect() {
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.onerror = null;
      this.ws.onmessage = null;
      try {
        this.ws.close();
      } catch {
        /* ignore */
      }
    }
    this.ws = null;
  }

  private ingestPackage(
    games: Record<string, { location_name_to_id: Record<string, number>; item_name_to_id: Record<string, number> }>,
  ) {
    for (const g of Object.values(games)) {
      for (const [name, id] of Object.entries(g.location_name_to_id ?? {})) this.locationNameToId.set(name, id);
      for (const [name, id] of Object.entries(g.item_name_to_id ?? {})) {
        this.itemNameToId.set(name, id);
        this.itemIdToName.set(id, name);
      }
    }
  }

  private send(packets: Packet[]) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(packets));
  }
}

function flattenPrint(pkt: Packet): string {
  if (typeof pkt.data === "string") return pkt.data;
  const parts = pkt.data as Array<{ text?: string }> | undefined;
  if (Array.isArray(parts)) return parts.map((p) => p.text ?? "").join("");
  return "";
}
