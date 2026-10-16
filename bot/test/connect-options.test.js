import assert from "node:assert/strict";
import { test } from "node:test";
import { connectPlan, resolveConnect } from "../src/connect-options.js";

test("only the room fields missing from the env are required", () => {
  const plan = connectPlan({ host: "archipelago.gg", slot: "DJ", port: "", game: "Needlecheck", password: "secret" });
  assert.deepEqual(
    plan.map((field) => field.name),
    ["port", "host", "slot", "game", "password"],
  );
  assert.deepEqual(
    plan.filter((field) => field.required).map((field) => field.name),
    ["port"],
  );
  assert.equal(plan.find((field) => field.name === "password").description.includes("secret"), false);
  assert.match(plan.find((field) => field.name === "host").description, /archipelago\.gg/);
});

test("host and slot stay required when the env does not have them", () => {
  const plan = connectPlan({ host: "", slot: "", port: "38281", game: "", password: "" });
  assert.deepEqual(
    plan.filter((field) => field.required).map((field) => field.name),
    ["host", "slot", "game"],
  );
});

test("a typed value overrides the env, and a missing port falls back", () => {
  const resolved = resolveConnect(
    { host: "other.example", slot: null, port: null, game: null, password: null },
    { host: "archipelago.gg", slot: "DJ", port: "", game: "", password: "secret" },
  );
  assert.deepEqual(resolved, {
    host: "other.example",
    slot: "DJ",
    port: "38281",
    game: "Needlecheck",
    password: "secret",
    missing: [],
  });
});
