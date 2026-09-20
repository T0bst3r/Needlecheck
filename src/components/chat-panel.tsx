import { useEffect, useRef, useState, type FormEvent } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { LOCAL_COMMANDS } from "@/lib/commands";
import type { ChatMessage, ItemClass } from "@/lib/types";
import { useStation } from "@/lib/store";
import { cn } from "@/lib/utils";

function classBadge(c?: ItemClass) {
  if (c === "progression") return <Badge variant="check">progression</Badge>;
  if (c === "useful") return <Badge variant="accent">useful</Badge>;
  if (c === "trap") return <Badge variant="danger">trap</Badge>;
  if (c === "filler") return <Badge>filler</Badge>;
  return null;
}

function toCommand(t: string) {
  if (t.startsWith("/")) return t;
  const first = t.split(/\s+/)[0]?.toLowerCase() ?? "";
  if (LOCAL_COMMANDS.has(first)) return `/${t}`;
  return `/play ${t}`;
}

function Row({ m }: { m: ChatMessage }) {
  return (
    <article className={cn("flex gap-3 rounded-md px-2 py-2", m.kind === "user" && "bg-surface-2/60")}>
      {m.art ? (
        <img
          src={m.art}
          alt=""
          className="mt-0.5 size-9 shrink-0 rounded-sm object-cover outline outline-1 -outline-offset-1 outline-fg/10"
        />
      ) : (
        <div className="mt-0.5 size-9 shrink-0 rounded-sm bg-surface-2" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-fg">{m.author}</span>
          {classBadge(m.classification)}
        </div>
        <p className="mt-0.5 whitespace-pre-wrap text-sm leading-snug text-muted">{m.text}</p>
      </div>
    </article>
  );
}

export function ChatPanel() {
  const chat = useStation((s) => s.chat);
  const send = useStation((s) => s.sendCommand);
  const [value, setValue] = useState("");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    send(toCommand(t));
    setValue("");
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl bg-surface p-3 shadow-[var(--shadow-border)] sm:p-4">
      <header className="mb-2 flex items-center justify-between px-1">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-subtle">Channel</p>
          <h2 className="text-sm font-medium text-fg">#listening-room</h2>
        </div>
        <p className="text-xs text-subtle">Slash commands</p>
      </header>
      <div ref={scroller} className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {chat.map((m) => (
          <Row key={m.id} m={m} />
        ))}
      </div>
      <form onSubmit={onSubmit} className="mt-3">
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="/play, /skip, /crate, /hint, /help"
          aria-label="Command"
          autoComplete="off"
        />
      </form>
    </section>
  );
}
