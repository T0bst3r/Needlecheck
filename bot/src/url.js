function isLocalHost(host) {
  const name = host.replace(/^\[|\]$/g, "").toLowerCase();
  if (!name) return false;
  if (
    name === "localhost" ||
    name === "host.docker.internal" ||
    name === "gateway.docker.internal" ||
    name.endsWith(".local") ||
    name.endsWith(".localhost") ||
    name.endsWith(".internal")
  ) {
    return true;
  }
  if (!name.includes(".")) return true;
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(name)) return true;
  return name.includes(":");
}

export function toWsUrl(host, port) {
  const raw = (host ?? "").trim();
  const p = String(port ?? "").trim() || "38281";
  if (raw.startsWith("ws://") || raw.startsWith("wss://")) {
    if (/:\d+$/.test(raw) || raw.includes("/")) return raw;
    return `${raw}:${p}`;
  }
  const h = raw.replace(/\/$/, "") || "archipelago.gg";
  const scheme = isLocalHost(h) ? "ws" : "wss";
  const named = h.includes(":") && !h.startsWith("[") ? `[${h}]` : h;
  return `${scheme}://${named}:${p}`;
}
