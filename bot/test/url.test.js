import assert from "node:assert/strict";
import { test } from "node:test";
import { toWsUrl } from "../src/ap.js";

test("a lan host stays on ws and archipelago.gg uses wss", () => {
  assert.equal(toWsUrl("localhost", "38281"), "ws://localhost:38281");
  assert.equal(toWsUrl("127.0.0.1", ""), "ws://127.0.0.1:38281");
  assert.equal(toWsUrl("192.168.1.20", "38281"), "ws://192.168.1.20:38281");
  assert.equal(toWsUrl("archipelago.gg", "38281"), "wss://archipelago.gg:38281");
});

test("an explicit websocket url is kept", () => {
  assert.equal(toWsUrl("ws://10.0.0.5:38281", "1"), "ws://10.0.0.5:38281");
  assert.equal(toWsUrl("wss://archipelago.gg:38281", "1"), "wss://archipelago.gg:38281");
});
