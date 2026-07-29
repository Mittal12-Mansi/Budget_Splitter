import { Link } from "wouter";
import { Zap, Clock, Trash2, Database } from "lucide-react";

const cacheKeys = [
  { key: "balances:group:{groupId}", ttl: "5 min", description: "Per-group member balance summary. Invalidated on expense create/update/delete and settlement create.", trigger: "GET /groups/:id/balances" },
  { key: "debtgraph:group:{groupId}", ttl: "5 min", description: "Optimized debt settlement graph for a group. Invalidated alongside balances since it depends on the same data.", trigger: "GET /groups/:id/debt-graph" },
  { key: "dashboard:user:{userId}", ttl: "2 min", description: "Per-user dashboard summary (totals, recent activity, group list). Shorter TTL since it aggregates across all groups.", trigger: "GET /dashboard/summary" },
];

const lifecycle = [
  {
    phase: "Cache Miss (Cold Path)",
    icon: "❄️",
    color: "bg-blue-50 border-blue-200",
    steps: [
      "Request arrives → getCached(key) returns undefined",
      "Run full DB query (join expenses + splits + settlements)",
      "Compute net balances for every member",
      "setCached(key, result, TTL) stores the result",
      "Return computed result to client",
    ],
    time: "~50-200ms (DB query)",
  },
  {
    phase: "Cache Hit (Warm Path)",
    icon: "🔥",
    color: "bg-green-50 border-green-200",
    steps: [
      "Request arrives → getCached(key) returns cached value",
      "No DB query executed",
      "Return cached result directly",
    ],
    time: "~1-2ms (memory lookup)",
  },
  {
    phase: "Cache Invalidation (Write Path)",
    icon: "🗑",
    color: "bg-amber-50 border-amber-200",
    steps: [
      "Mutation completes (expense added, settlement recorded)",
      "invalidateCache('balances:group:1') scans all keys",
      "Any key containing the pattern is deleted",
      "Next read is a cache miss → fresh DB query",
    ],
    time: "Instant (synchronous key deletion)",
  },
];

export default function DocsCaching() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Caching Lifecycle</h1>
        <p className="text-muted-foreground mt-2">
          How TTL-based in-memory caching reduces database load for expensive balance calculations.
        </p>
      </div>

      <div className="flex items-start gap-4 p-4 rounded-xl bg-muted/40 border text-sm">
        <Database className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div>
          <strong>Implementation:</strong> node-cache (in-memory, process-scoped). In production with multiple
          instances, replace with Redis for distributed cache consistency. The interface is identical —
          just swap the getCached/setCached implementations.
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Zap className="h-5 w-5" /> Cache Keys</h2>
        <div className="space-y-3">
          {cacheKeys.map((c) => (
            <div key={c.key} className="border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <code className="font-mono text-sm text-primary font-semibold">{c.key}</code>
                <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" />{c.ttl}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{c.description}</p>
              <div className="text-xs bg-muted/50 px-3 py-1 rounded font-mono">Populated by: {c.trigger}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Cache Paths</h2>
        <div className="grid gap-4">
          {lifecycle.map((path) => (
            <div key={path.phase} className={`rounded-xl border p-5 ${path.color}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{path.icon}</span>
                  <h3 className="font-semibold text-sm">{path.phase}</h3>
                </div>
                <span className="text-xs font-mono bg-black/5 px-2 py-0.5 rounded">{path.time}</span>
              </div>
              <ol className="space-y-1.5">
                {path.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-foreground/30 shrink-0 font-mono text-xs mt-0.5">{i + 1}.</span>
                    <span className="text-foreground/70">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-5">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Trash2 className="h-4 w-4" /> Invalidation Pattern</h3>
        <pre className="text-xs font-mono bg-muted/40 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">{`// Pattern-based invalidation using node-cache
export function invalidateCache(pattern: string): void {
  const keys = cache.keys(); // get all active keys
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.del(key); // delete any key matching the pattern
    }
  }
}

// After creating an expense in group 1:
invalidateCache('balances:group:1');   // deletes 'balances:group:1'
invalidateCache('debtgraph:group:1');  // deletes 'debtgraph:group:1'
invalidateCache('dashboard:user:42'); // deletes 'dashboard:user:42'`}</pre>
      </section>
    </div>
  );
}
