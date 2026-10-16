const FIELDS = [
  { name: "host", label: "Host, such as archipelago.gg" },
  { name: "slot", label: "Slot name" },
  { name: "port", label: "Port" },
  { name: "game", label: "Game name" },
  { name: "password", label: "Room password", optional: true },
];

export function connectPlan(env) {
  const fields = FIELDS.map((field) => ({ ...field, value: String(env?.[field.name] ?? "").trim() }));
  const required = fields.filter((field) => !field.optional && !field.value);
  const optional = fields.filter((field) => field.optional || field.value);
  return [...required, ...optional].map((field) => ({
    name: field.name,
    required: !field.optional && !field.value,
    description: describe(field).slice(0, 100),
  }));
}

function describe(field) {
  if (!field.value) return field.label;
  if (field.name === "password") return "Uses the password from the bot settings unless you change it";
  return `Uses ${field.value} unless you change it`;
}

export function resolveConnect(given, env) {
  const host = text(given.host) || text(env.host);
  const slot = text(given.slot) || text(env.slot);
  const port = text(given.port) || text(env.port) || "38281";
  const game = text(given.game) || text(env.game) || "Needlecheck";
  const password = given.password == null || given.password === "" ? text(env.password) : text(given.password);
  const missing = [];
  if (!host) missing.push("host");
  if (!slot) missing.push("slot");
  return { host, slot, port, game, password, missing };
}

function text(value) {
  return String(value ?? "").trim();
}
