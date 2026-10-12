import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mock, test } from "node:test";
import { ArchipelagoClient } from "../src/ap.js";

class FakeSocket extends EventEmitter {
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 1;
    this.closed = false;
    this.sent = [];
  }

  send(data) {
    this.sent.push(JSON.parse(data));
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

function room(socket, { checked = [] } = {}) {
  socket.emit("message", JSON.stringify([{ cmd: "RoomInfo", games: ["Needlecheck"] }]));
  socket.emit(
    "message",
    JSON.stringify([
      {
        cmd: "Connected",
        slot: 1,
        slot_data: { albums: [] },
        checked_locations: checked,
        missing_locations: [],
        players: [],
      },
    ]),
  );
}

function clientWith(sockets, statuses) {
  return new ArchipelagoClient(
    {
      onStatus(status) {
        statuses.push(status);
      },
      onSlot() {},
      onConnected() {},
    },
    (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      return socket;
    },
  );
}

test("a second /connect does not reconnect the room it replaced", async () => {
  const sockets = [];
  const statuses = [];
  const client = clientWith(sockets, statuses);

  const first = client.connect({ host: "old.example", port: "38281", slot: "DJ" });
  room(sockets[0]);
  await first;

  const second = client.connect({ host: "archipelago.gg", port: "38281", slot: "DJ" });
  assert.equal(sockets[0].closed, true);
  sockets[0].emit("close");
  sockets[0].emit("message", JSON.stringify([{ cmd: "PrintJSON", data: "still in the old room" }]));
  room(sockets[1]);
  await second;

  assert.equal(sockets.length, 2);
  assert.equal(client.reconnectTimer, null);
  assert.equal(sockets[1].url, "wss://archipelago.gg:38281");
  assert.ok(!statuses.includes("disconnected"));
});

test("a dropped room schedules one reconnect, not two", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const sockets = [];
    const client = clientWith(sockets, []);
    const first = client.connect({ host: "archipelago.gg", port: "38281", slot: "DJ" });
    room(sockets[0]);
    await first;

    sockets[0].emit("close");
    sockets[0].emit("close");
    assert.ok(client.reconnectTimer);
    mock.timers.tick(5000);
    assert.equal(sockets.length, 2);
    mock.timers.tick(5000);
    assert.equal(sockets.length, 2);
  } finally {
    mock.timers.reset();
  }
});
