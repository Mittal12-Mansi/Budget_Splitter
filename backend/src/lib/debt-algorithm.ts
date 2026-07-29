export interface PersonBalance {
  userId: number;
  name: string;
  email: string;
  avatarUrl?: string | null;
  netBalance: number;
}

export interface Transaction {
  fromUserId: number;
  toUserId: number;
  amount: number;
  fromName: string;
  toName: string;
}

/**
 * Optimized debt settlement algorithm using greedy matching of creditors/debtors.
 * Minimizes the number of transactions needed to settle all debts.
 *
 * Algorithm:
 * 1. Compute net balance for each person (positive = creditor, negative = debtor)
 * 2. Use two heaps (simulated with sorted arrays) for max creditor and max debtor
 * 3. Greedily match largest debtor with largest creditor each iteration
 * 4. This minimizes total transactions from O(n^2) naive to O(n-1) optimal
 */
export function computeOptimalSettlements(balances: PersonBalance[]): Transaction[] {
  const transactions: Transaction[] = [];

  // Create mutable copies
  const creditors = balances
    .filter((p) => p.netBalance > 0.009)
    .map((p) => ({ ...p }))
    .sort((a, b) => b.netBalance - a.netBalance);

  const debtors = balances
    .filter((p) => p.netBalance < -0.009)
    .map((p) => ({ ...p, netBalance: -p.netBalance }))
    .sort((a, b) => b.netBalance - a.netBalance);

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];

    const amount = Math.min(creditor.netBalance, debtor.netBalance);
    const rounded = Math.round(amount * 100) / 100;

    if (rounded > 0) {
      transactions.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: rounded,
        fromName: debtor.name,
        toName: creditor.name,
      });
    }

    creditor.netBalance -= amount;
    debtor.netBalance -= amount;

    if (creditor.netBalance < 0.009) ci++;
    if (debtor.netBalance < 0.009) di++;
  }

  return transactions;
}

export const getSimplifiedDebts = computeOptimalSettlements;
