import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { staffApi } from "../api";
import { Search, ClipboardList, Users, Layers, Loader2 } from "lucide-react";
import { StatusPill } from "./StatusPill";

export default function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setTimeout(() => setDebounced(q.trim()), 220); return () => clearTimeout(t); }, [q]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const { data, isFetching } = useQuery<any>({
    queryKey: ["global-search", debounced],
    queryFn: () => staffApi.get(`/staff/search?q=${encodeURIComponent(debounced)}`).then(r => r.data),
    enabled: debounced.length >= 2,
    staleTime: 10_000,
  });

  const go = (to: string) => { setOpen(false); setQ(""); navigate(to); };
  const counts = data ? (data.orders.length + data.customers.length + data.skus.length) : 0;

  return (
    <div ref={boxRef} className="relative hidden lg:block ml-2">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-4" />
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search orders, customers, products..."
        className="h-9 w-[260px] rounded-full bg-canvas pl-9 pr-4 text-sm outline-none border border-transparent focus:border-input focus:bg-surface transition-colors placeholder:text-ink-4"
      />
      {isFetching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-ink-4 animate-spin" />}

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 top-11 z-50 w-[360px] bg-surface rounded-2xl shadow-[var(--shadow-lg)] border border-border overflow-hidden max-h-[70vh] overflow-y-auto">
          {!data ? (
            <div className="px-4 py-6 text-center text-sm text-ink-4">Searching…</div>
          ) : counts === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-ink-4">No matches for “{debounced}”</div>
          ) : (
            <>
              {data.orders.length > 0 && (
                <Group label="Orders">
                  {data.orders.map((o: any) => (
                    <Row key={`o${o.id}`} icon={<ClipboardList className="size-4" />} onClick={() => go(`/staff/orders/${o.id}`)}
                      title={<span className="font-mono font-semibold">{o.order_number}</span>} sub={o.customer_name}
                      right={<StatusPill status={o.status} />} />
                  ))}
                </Group>
              )}
              {data.customers.length > 0 && (
                <Group label="Customers">
                  {data.customers.map((c: any) => (
                    <Row key={`c${c.id}`} icon={<Users className="size-4" />} onClick={() => go(`/staff/customers/${c.id}`)}
                      title={c.name} sub={[c.company, c.phone].filter(Boolean).join(" · ")} />
                  ))}
                </Group>
              )}
              {data.skus.length > 0 && (
                <Group label="Products">
                  {data.skus.map((s: any) => (
                    <Row key={`s${s.id}`} icon={<Layers className="size-4" />} onClick={() => go(`/staff/catalog`)}
                      title={s.name} sub={s.code} right={<span className="text-[13px] font-semibold">₹{Number(s.price).toLocaleString("en-IN")}</span>} />
                  ))}
                </Group>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border last:border-0">
      <div className="px-4 pt-2.5 pb-1 text-[10px] font-bold uppercase tracking-wide text-ink-4">{label}</div>
      {children}
    </div>
  );
}
function Row({ icon, title, sub, right, onClick }: { icon: React.ReactNode; title: React.ReactNode; sub?: string; right?: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-canvas text-left transition-colors">
      <span className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-primary shrink-0">{icon}</span>
      <span className="flex-1 min-w-0"><span className="block text-sm truncate">{title}</span>{sub && <span className="block text-[12px] text-ink-4 truncate">{sub}</span>}</span>
      {right}
    </button>
  );
}
