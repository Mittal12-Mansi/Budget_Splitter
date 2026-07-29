import { Link } from "wouter";

const entities = [
  {
    name: "users",
    color: "border-blue-400 bg-blue-50",
    headerColor: "bg-blue-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "name", type: "TEXT NOT NULL", note: "" },
      { name: "email", type: "TEXT UNIQUE NOT NULL", note: "" },
      { name: "password_hash", type: "TEXT NOT NULL", note: "bcrypt" },
      { name: "avatar_url", type: "TEXT", note: "nullable" },
      { name: "created_at", type: "TIMESTAMP", note: "DEFAULT NOW()" },
    ],
  },
  {
    name: "groups",
    color: "border-purple-400 bg-purple-50",
    headerColor: "bg-purple-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "name", type: "TEXT NOT NULL", note: "" },
      { name: "description", type: "TEXT", note: "nullable" },
      { name: "currency", type: "TEXT NOT NULL", note: "DEFAULT 'USD'" },
      { name: "owner_id", type: "INT FK→users.id", note: "" },
      { name: "created_at", type: "TIMESTAMP", note: "DEFAULT NOW()" },
    ],
  },
  {
    name: "memberships",
    color: "border-indigo-400 bg-indigo-50",
    headerColor: "bg-indigo-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "group_id", type: "INT FK→groups.id", note: "CASCADE" },
      { name: "user_id", type: "INT FK→users.id", note: "" },
      { name: "role", type: "TEXT NOT NULL", note: "'owner'|'member'" },
      { name: "joined_at", type: "TIMESTAMP", note: "DEFAULT NOW()" },
    ],
  },
  {
    name: "expenses",
    color: "border-amber-400 bg-amber-50",
    headerColor: "bg-amber-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "group_id", type: "INT FK→groups.id", note: "CASCADE" },
      { name: "description", type: "TEXT NOT NULL", note: "" },
      { name: "amount", type: "NUMERIC(12,2)", note: "" },
      { name: "payer_id", type: "INT FK→users.id", note: "" },
      { name: "split_type", type: "TEXT NOT NULL", note: "equal|percentage|amount" },
      { name: "category", type: "TEXT", note: "nullable" },
      { name: "created_at", type: "TIMESTAMP", note: "DEFAULT NOW()" },
    ],
  },
  {
    name: "expense_splits",
    color: "border-green-400 bg-green-50",
    headerColor: "bg-green-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "expense_id", type: "INT FK→expenses.id", note: "CASCADE" },
      { name: "user_id", type: "INT FK→users.id", note: "" },
      { name: "amount", type: "NUMERIC(12,2)", note: "" },
    ],
  },
  {
    name: "settlements",
    color: "border-teal-400 bg-teal-50",
    headerColor: "bg-teal-400 text-white",
    fields: [
      { name: "id", type: "SERIAL PK", note: "" },
      { name: "group_id", type: "INT FK→groups.id", note: "CASCADE" },
      { name: "payer_id", type: "INT FK→users.id", note: "" },
      { name: "receiver_id", type: "INT FK→users.id", note: "" },
      { name: "amount", type: "NUMERIC(12,2)", note: "" },
      { name: "note", type: "TEXT", note: "nullable" },
      { name: "created_at", type: "TIMESTAMP", note: "DEFAULT NOW()" },
    ],
  },
];

const relations = [
  { from: "users", to: "groups", label: "owner_id", type: "1 : N" },
  { from: "users", to: "memberships", label: "user_id", type: "1 : N" },
  { from: "groups", to: "memberships", label: "group_id", type: "1 : N" },
  { from: "groups", to: "expenses", label: "group_id", type: "1 : N" },
  { from: "expenses", to: "expense_splits", label: "expense_id", type: "1 : N" },
  { from: "users", to: "expense_splits", label: "user_id", type: "1 : N" },
  { from: "groups", to: "settlements", label: "group_id", type: "1 : N" },
  { from: "users", to: "settlements", label: "payer_id / receiver_id", type: "1 : N" },
];

export default function DocsDatabase() {
  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Database Schema</h1>
        <p className="text-muted-foreground mt-2">
          Entity relationship model for the Smart Budget Splitter PostgreSQL database.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Entity Tables</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {entities.map((e) => (
            <div key={e.name} className={`rounded-xl border-2 overflow-hidden ${e.color}`}>
              <div className={`px-4 py-2.5 font-mono font-bold text-sm ${e.headerColor}`}>
                {e.name}
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {e.fields.map((f) => (
                    <tr key={f.name} className="border-t border-black/5">
                      <td className="px-3 py-1.5 font-mono font-medium text-foreground/80">{f.name}</td>
                      <td className="px-2 py-1.5 font-mono text-foreground/50 text-right">
                        {f.type}
                        {f.note && <span className="ml-1 text-foreground/30">({f.note})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Relationships</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-3 font-semibold">From</th>
                <th className="text-left px-4 py-3 font-semibold">To</th>
                <th className="text-left px-4 py-3 font-semibold">Key</th>
                <th className="text-left px-4 py-3 font-semibold">Cardinality</th>
              </tr>
            </thead>
            <tbody>
              {relations.map((r, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-blue-700">{r.from}</td>
                  <td className="px-4 py-2.5 font-mono text-xs font-medium text-purple-700">{r.to}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{r.label}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground font-medium">{r.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border rounded-xl p-5 bg-muted/30">
        <h3 className="font-semibold mb-3">Drizzle ORM — Schema Example</h3>
        <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`import { pgTable, serial, text, integer, numeric, timestamp } from "drizzle-orm/pg-core";

export const expensesTable = pgTable("expenses", {
  id:          serial("id").primaryKey(),
  groupId:     integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount:      numeric("amount", { precision: 12, scale: 2 }).notNull(),
  payerId:     integer("payer_id").notNull().references(() => usersTable.id),
  splitType:   text("split_type").notNull().default("equal"),
  category:    text("category"),
  createdAt:   timestamp("created_at").defaultNow().notNull(),
});`}</pre>
      </section>
    </div>
  );
}
