import { Link } from "wouter";
import { ShieldCheck, Key, RefreshCw, AlertTriangle } from "lucide-react";

const tokenParts = [
  {
    label: "Header",
    color: "text-rose-600",
    bg: "bg-rose-50 border-rose-200",
    value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
    decoded: `{ "alg": "HS256", "typ": "JWT" }`,
    description: "Specifies the signing algorithm (HMAC-SHA256) and token type.",
  },
  {
    label: "Payload",
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    value: "eyJ1c2VySWQiOjEsImVtYWlsIjoiYWxpY2VAZGVtby5jb20iLCJpYXQiOjE3MDA...fQ",
    decoded: `{ "userId": 1, "email": "alice@demo.com", "iat": 1700000000, "exp": 1700604800 }`,
    description: "Contains the claims: userId, email, issued-at (iat) and expiry (exp) timestamps.",
  },
  {
    label: "Signature",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    value: "ab2iFW-5UpJ1BwClghyCXhPwltnTm-RTuG_neaVsVU8",
    decoded: `HMACSHA256(base64(header) + "." + base64(payload), SECRET_KEY)`,
    description: "A cryptographic signature that proves the token hasn't been tampered with.",
  },
];

const lifecycle = [
  {
    icon: "1",
    title: "Registration / Login",
    color: "bg-blue-100 text-blue-700",
    steps: [
      "POST /api/auth/login with { email, password }",
      "Server validates credentials (bcrypt compare)",
      "jwt.sign({ userId, email }, SECRET, { expiresIn: '7d' })",
      "Token returned in response body",
    ],
  },
  {
    icon: "2",
    title: "Client Storage",
    color: "bg-purple-100 text-purple-700",
    steps: [
      "localStorage.setItem('token', token)",
      "AuthContext stores token in React state",
      "setAuthTokenGetter(() => localStorage.getItem('token'))",
      "Custom fetch layer now auto-attaches the token",
    ],
  },
  {
    icon: "3",
    title: "Authenticated Request",
    color: "bg-amber-100 text-amber-700",
    steps: [
      "Any API hook fires (e.g. useGetGroups)",
      "custom-fetch reads token via the getter",
      "Attaches: Authorization: Bearer <token>",
      "Request reaches Express with auth header",
    ],
  },
  {
    icon: "4",
    title: "Server Validation",
    color: "bg-green-100 text-green-700",
    steps: [
      "requireAuth middleware extracts header",
      "jwt.verify(token, SECRET) decodes & validates",
      "req.user = { userId, email } is set",
      "Route handler proceeds with trusted identity",
    ],
  },
  {
    icon: "5",
    title: "Token Expiry & Logout",
    color: "bg-rose-100 text-rose-700",
    steps: [
      "After 7 days, token expires (exp claim)",
      "Server returns 401 Unauthorized",
      "Client detects 401, calls logout()",
      "localStorage cleared, redirect to /login",
    ],
  },
];

export default function DocsJwt() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">JWT Authentication</h1>
        <p className="text-muted-foreground mt-2">
          How JSON Web Tokens are created, stored, transmitted, and validated in this app.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Key className="h-5 w-5" /> Token Structure</h2>
        <p className="text-sm text-muted-foreground">A JWT is three base64url-encoded strings joined by dots. Hover each part to see the decoded value.</p>
        <div className="font-mono text-sm p-4 bg-muted/40 rounded-xl border break-all leading-relaxed">
          {tokenParts.map((p, i) => (
            <span key={p.label} className={`${p.color} font-semibold`}>
              {p.value}{i < 2 ? "." : ""}
            </span>
          ))}
        </div>
        <div className="grid gap-3">
          {tokenParts.map((p) => (
            <div key={p.label} className={`rounded-lg border p-4 ${p.bg}`}>
              <div className={`text-xs font-bold uppercase tracking-wider ${p.color} mb-1`}>{p.label}</div>
              <p className="text-sm text-foreground/70 mb-2">{p.description}</p>
              <pre className="text-xs font-mono bg-black/5 rounded p-2 overflow-x-auto">{p.decoded}</pre>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><RefreshCw className="h-5 w-5" /> Lifecycle</h2>
        <div className="grid gap-3">
          {lifecycle.map((phase) => (
            <div key={phase.title} className="border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className={`w-7 h-7 rounded-full ${phase.color} text-sm font-bold flex items-center justify-center`}>{phase.icon}</span>
                <h3 className="font-semibold">{phase.title}</h3>
              </div>
              <ol className="space-y-1">
                {phase.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-foreground/30 mt-0.5 shrink-0">→</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{step}</code>
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      <section className="border rounded-xl p-5 bg-amber-50 border-amber-200">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          <h3 className="font-semibold text-amber-800">Security Notes</h3>
        </div>
        <ul className="space-y-2 text-sm text-amber-700">
          <li>• JWTs stored in localStorage are vulnerable to XSS. In production, prefer httpOnly cookies.</li>
          <li>• The server secret is currently a default string — set JWT_SECRET env var in production.</li>
          <li>• Token expiry is 7 days. Implementing refresh tokens would reduce the window of exposure.</li>
          <li>• All sensitive endpoints require the Authorization header — no unauthenticated data exposure.</li>
        </ul>
      </section>
    </div>
  );
}
