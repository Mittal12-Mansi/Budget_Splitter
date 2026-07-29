import { ArrowRight, Layers, Server, Database, Cpu } from "lucide-react";
import { Link } from "wouter";

const steps = [
  {
    step: 1,
    label: "User Action",
    icon: "🖱",
    color: "bg-blue-50 border-blue-200 text-blue-800",
    code: `// React component triggers mutation
const createExpense = useCreateExpense();
createExpense.mutate({
  data: { description, amount, payerId, splitType }
});`,
    detail: "User fills a form and submits. React Hook Form validates the data. The generated mutation hook from @workspace/api-client-react is called.",
  },
  {
    step: 2,
    label: "Axios / Custom Fetch",
    icon: "📡",
    color: "bg-purple-50 border-purple-200 text-purple-800",
    code: `// custom-fetch.ts intercepts every request
if (_authTokenGetter && !headers.has("authorization")) {
  const token = await _authTokenGetter();
  if (token) headers.set("authorization", \`Bearer \${token}\`);
}`,
    detail: "The custom fetch layer reads the JWT from localStorage via the registered getter and attaches it as an Authorization: Bearer header to every outgoing request.",
  },
  {
    step: 3,
    label: "Express Router (API Server)",
    icon: "🔀",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
    code: `// routes/index.ts
router.use("/groups/:groupId/expenses", expensesRouter);

// JWT middleware validates token first
router.use(requireAuth);`,
    detail: "The Express router matches the path /api/groups/:groupId/expenses. Before the handler runs, the requireAuth middleware validates the JWT.",
  },
  {
    step: 4,
    label: "JWT Middleware",
    icon: "🔐",
    color: "bg-amber-50 border-amber-200 text-amber-800",
    code: `// middlewares/auth.ts
const token = req.headers.authorization?.slice(7);
req.user = verifyToken(token); // throws if invalid
next();`,
    detail: "The middleware extracts the Bearer token, verifies it with jsonwebtoken using the shared secret, and attaches the decoded user payload to req.user.",
  },
  {
    step: 5,
    label: "Route Handler & Service",
    icon: "⚙️",
    color: "bg-green-50 border-green-200 text-green-800",
    code: `// routes/expenses.ts
const [expense] = await db.insert(expensesTable)
  .values({ groupId, description, amount, payerId, splitType })
  .returning();

// Compute and insert splits
await db.insert(expenseSplitsTable).values(splits);`,
    detail: "The route handler performs business logic: inserts the expense, computes splits based on the split type (equal/percentage/amount), and saves them.",
  },
  {
    step: 6,
    label: "Cache Invalidation",
    icon: "🗑",
    color: "bg-orange-50 border-orange-200 text-orange-800",
    code: `// After write, invalidate related caches
invalidateCache(\`balances:group:\${groupId}\`);
invalidateCache(\`debtgraph:group:\${groupId}\`);
invalidateCache(\`dashboard:user:\${userId}\`);`,
    detail: "After every mutation, the in-memory cache keys for balances, debt graph, and dashboard are invalidated. The next read will recompute fresh data.",
  },
  {
    step: 7,
    label: "Database (PostgreSQL)",
    icon: "🗄",
    color: "bg-teal-50 border-teal-200 text-teal-800",
    code: `// Drizzle ORM query
const splits = await db
  .select()
  .from(expenseSplitsTable)
  .where(eq(expenseSplitsTable.expenseId, id));`,
    detail: "Drizzle ORM generates type-safe SQL. PostgreSQL persists all data across the normalized tables: expenses, expense_splits, users, groups, memberships, settlements.",
  },
  {
    step: 8,
    label: "JSON Response",
    icon: "📤",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
    code: `// Route sends shaped response
res.status(201).json({
  id, groupId, description, amount,
  payer: { id, name, email },
  splits: [{ userId, amount, user }]
});`,
    detail: "The route returns a shaped response with joined data (payer user object, split users). Status 201 for creation, 200 for reads.",
  },
  {
    step: 9,
    label: "React Query Cache Update",
    icon: "♻️",
    color: "bg-cyan-50 border-cyan-200 text-cyan-800",
    code: `// In the mutation's onSuccess callback
queryClient.invalidateQueries({
  queryKey: getGetExpensesQueryKey(groupId)
});`,
    detail: "React Query invalidates the relevant query key. All components subscribed to that key automatically refetch and re-render with fresh data.",
  },
];

export default function DocsArchitecture() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-8">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Full Request Flow</h1>
        <p className="text-muted-foreground mt-2">
          End-to-end lifecycle of a request from a React component through to the database and back.
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/40 border border-border text-sm">
        <Layers className="h-5 w-5 text-primary shrink-0" />
        <span>This walkthrough uses "create expense" as the example. Every write follows this same pattern.</span>
      </div>

      <div className="space-y-4">
        {steps.map((s, i) => (
          <div key={s.step} className="relative">
            {i < steps.length - 1 && (
              <div className="absolute left-6 top-[4.5rem] bottom-0 w-px bg-border z-0" />
            )}
            <div className={`relative z-10 rounded-xl border p-5 ${s.color}`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center text-xl font-mono shrink-0 shadow-sm">
                  {s.step}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <h3 className="font-semibold text-base">{s.label}</h3>
                  </div>
                  <p className="text-sm opacity-80 mb-3">{s.detail}</p>
                  <pre className="bg-black/10 rounded-lg p-3 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{s.code}</pre>
                </div>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className="flex justify-center mt-1 mb-1 relative z-10">
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
