import { Link } from "wouter";
import { Shield, Filter, CheckCircle2, XCircle } from "lucide-react";

const chain = [
  {
    step: "1",
    name: "Incoming Request",
    description: "Any HTTP request arrives at the Express server on the /api prefix.",
    icon: "→",
    color: "bg-slate-50 border-slate-200",
    code: `GET /api/groups/1/balances
Authorization: Bearer eyJhbGci...`,
  },
  {
    step: "2",
    name: "CORS Middleware",
    description: "cors() validates Origin header. Allows all origins in dev, restrict in production.",
    icon: "🌐",
    color: "bg-blue-50 border-blue-200",
    code: `app.use(cors());
// Allows cross-origin requests
// In production: cors({ origin: 'https://your-app.com' })`,
  },
  {
    step: "3",
    name: "Body Parser",
    description: "express.json() parses the request body into req.body for POST/PATCH requests.",
    icon: "📋",
    color: "bg-indigo-50 border-indigo-200",
    code: `app.use(express.json());
// req.body is now a typed JS object`,
  },
  {
    step: "4",
    name: "requireAuth Middleware",
    description: "Extracts and verifies the JWT on every protected route. Sets req.user on success.",
    icon: "🔐",
    color: "bg-amber-50 border-amber-200",
    code: `export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.slice(7);
  try {
    req.user = verifyToken(token); // { userId, email }
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}`,
  },
  {
    step: "5",
    name: "Route Handler (Authorized)",
    description: "req.user is now trusted. Route handler uses req.user.userId to scope DB queries.",
    icon: "✅",
    color: "bg-green-50 border-green-200",
    code: `// Only fetch groups where the current user is a member
const memberships = await db
  .select()
  .from(membershipsTable)
  .where(eq(membershipsTable.userId, req.user.userId));`,
  },
  {
    step: "6",
    name: "Authorization Check (per resource)",
    description: "Beyond authentication, handlers verify the user has permission to access the specific resource.",
    icon: "🛡",
    color: "bg-violet-50 border-violet-200",
    code: `// Not just any authenticated user can access any group
const isMember = await checkGroupMember(groupId, userId);
if (!isMember) {
  return res.status(403).json({ error: "Forbidden" });
}`,
  },
];

const publicRoutes = ["/api/healthz", "/api/auth/register", "/api/auth/login"];
const protectedRoutes = ["/api/auth/me", "/api/groups/*", "/api/groups/*/expenses/*", "/api/dashboard/*", "/api/users/*"];

export default function DocsSecurity() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Security Filter Chain</h1>
        <p className="text-muted-foreground mt-2">
          How every request is authenticated and authorized before touching the database.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-green-800">Public Routes (no JWT)</span>
          </div>
          <ul className="space-y-1">
            {publicRoutes.map((r) => (
              <li key={r} className="text-xs font-mono text-green-700 bg-green-100 px-2 py-1 rounded">{r}</li>
            ))}
          </ul>
        </div>
        <div className="border rounded-xl p-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Protected Routes (JWT required)</span>
          </div>
          <ul className="space-y-1">
            {protectedRoutes.map((r) => (
              <li key={r} className="text-xs font-mono text-amber-700 bg-amber-100 px-2 py-1 rounded">{r}</li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Filter className="h-5 w-5" /> Middleware Chain
        </h2>
        <div className="space-y-3">
          {chain.map((c, i) => (
            <div key={c.step} className={`rounded-xl border p-5 ${c.color}`}>
              <div className="flex items-start gap-3">
                <span className="w-8 h-8 rounded-full bg-white/60 flex items-center justify-center text-sm font-bold shrink-0 shadow-sm">{c.step}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span>{c.icon}</span>
                    <h3 className="font-semibold text-sm">{c.name}</h3>
                  </div>
                  <p className="text-xs text-foreground/70 mb-3">{c.description}</p>
                  <pre className="bg-black/5 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{c.code}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-5 bg-muted/30">
        <h3 className="font-semibold mb-3 flex items-center gap-2"><XCircle className="h-4 w-4 text-rose-500" /> What happens on failure</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Missing Authorization header</span>
            <code className="font-mono text-rose-600">401 Unauthorized</code>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Invalid / malformed token</span>
            <code className="font-mono text-rose-600">401 Invalid token</code>
          </div>
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Expired token (exp claim past)</span>
            <code className="font-mono text-rose-600">401 Invalid token</code>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-muted-foreground">Authenticated but not a group member</span>
            <code className="font-mono text-orange-600">403 Forbidden</code>
          </div>
        </div>
      </section>
    </div>
  );
}
