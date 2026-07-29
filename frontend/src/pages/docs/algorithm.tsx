import { Link } from "wouter";
import { GitBranch, TrendingDown } from "lucide-react";

const splitTypes = [
  {
    name: "Equal Split",
    icon: "÷",
    description: "The total is divided evenly across all group members.",
    example: "$120 dinner, 3 people → each owes $40",
    code: `const share = Math.round((totalAmount / members.length) * 100) / 100;
for (const m of members) {
  splits.push({ expenseId, userId: m.userId, amount: share });
}`,
  },
  {
    name: "Percentage Split",
    icon: "%",
    description: "Each member is assigned a custom percentage. Percentages must sum to 100.",
    example: "$100 rent: Alice 50%, Bob 30%, Carol 20%",
    code: `for (const s of customSplits) {
  const amount = Math.round((totalAmount * s.value) / 100 * 100) / 100;
  splits.push({ expenseId, userId: s.userId, amount });
}`,
  },
  {
    name: "Custom Amount",
    icon: "$",
    description: "Each member is assigned an explicit dollar amount. Amounts must sum to total.",
    example: "$150 groceries: Alice $70, Bob $50, Carol $30",
    code: `for (const s of customSplits) {
  splits.push({ expenseId, userId: s.userId, amount: s.value });
}`,
  },
];

const naiveExample = [
  { from: "Alice", to: "Bob", amount: 20 },
  { from: "Alice", to: "Carol", amount: 15 },
  { from: "Bob", to: "Carol", amount: 10 },
];

const optimizedExample = [
  { from: "Alice", to: "Carol", amount: 25 },
  { from: "Bob", to: "Carol", amount: 10 },
];

const algorithmSteps = [
  "Compute net balance for each person (totalPaid − totalOwed, accounting for settlements)",
  "Separate into creditors (positive balance) and debtors (negative balance)",
  "Sort both lists by absolute value descending (greedy: biggest amounts first)",
  "Match the largest debtor with the largest creditor",
  "min(debtor.amount, creditor.amount) becomes the transaction amount",
  "Reduce both balances by that amount; advance the pointer for whichever reaches zero",
  "Repeat until all balances are settled (±0.01 tolerance for floating point)",
];

export default function DocsAlgorithm() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Splitting & Settlement Algorithm</h1>
        <p className="text-muted-foreground mt-2">
          How expenses are split and how the debt graph minimizes the number of transactions.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><GitBranch className="h-5 w-5" /> Expense Split Types</h2>
        <div className="grid gap-4">
          {splitTypes.map((s) => (
            <div key={s.name} className="border rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xl font-bold shrink-0">{s.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1">{s.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{s.description}</p>
                  <div className="text-xs bg-muted/50 px-3 py-1.5 rounded-md mb-3 font-medium">{s.example}</div>
                  <pre className="text-xs font-mono bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{s.code}</pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-xl font-semibold flex items-center gap-2"><TrendingDown className="h-5 w-5" /> Debt Minimization Algorithm</h2>
        <p className="text-sm text-muted-foreground">
          The naive approach — one transaction per (debtor, creditor) pair — creates O(n²) transactions.
          The greedy algorithm reduces this to at most n−1 transactions.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border rounded-xl p-5 bg-rose-50 border-rose-200">
            <h3 className="font-semibold text-rose-800 mb-3">Naive — 3 transactions</h3>
            <div className="space-y-2">
              {naiveExample.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-rose-700">{t.from} → {t.to}</span>
                  <span className="text-rose-600 font-mono">${t.amount}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border rounded-xl p-5 bg-green-50 border-green-200">
            <h3 className="font-semibold text-green-800 mb-3">Optimized — 2 transactions</h3>
            <div className="space-y-2">
              {optimizedExample.map((t, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="font-medium text-green-700">{t.from} → {t.to}</span>
                  <span className="text-green-600 font-mono">${t.amount}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-green-600 mt-3">Alice's debts to Bob and Carol are combined into a single payment through Carol.</p>
          </div>
        </div>

        <div className="border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Algorithm Steps</h3>
          <ol className="space-y-2">
            {algorithmSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                <span className="text-muted-foreground">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="border rounded-xl p-5 bg-muted/30">
          <h3 className="font-semibold mb-3">Implementation</h3>
          <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">{`export function computeOptimalSettlements(balances) {
  const creditors = balances.filter(p => p.netBalance > 0.009).sort(...);
  const debtors   = balances.filter(p => p.netBalance < -0.009)
                             .map(p => ({ ...p, netBalance: -p.netBalance })).sort(...);

  let ci = 0, di = 0;
  while (ci < creditors.length && di < debtors.length) {
    const amount = Math.min(creditors[ci].netBalance, debtors[di].netBalance);
    transactions.push({ from: debtors[di], to: creditors[ci], amount });
    creditors[ci].netBalance -= amount;
    debtors[di].netBalance  -= amount;
    if (creditors[ci].netBalance < 0.009) ci++;
    if (debtors[di].netBalance  < 0.009) di++;
  }
}`}</pre>
        </div>
      </section>
    </div>
  );
}
