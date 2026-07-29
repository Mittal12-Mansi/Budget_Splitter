# Interview-Ready Resume Highlights & Technical Architecture

## 🚀 Resume Bullet Points (Copy & Paste for Resume)

- **Full-Stack Budget & Expense Splitting Application** | *TypeScript, React 19, Express.js, PostgreSQL, Drizzle ORM, TanStack Query*
  - Engineered a high-performance expense sharing platform with **role-based access control (RBAC)** and **JWT authentication** supporting multi-member group management and personal expense tracking.
  - Formulated a **Greedy Minimum Cash Flow Debt Simplification Algorithm** ($\mathcal{O}(N \log N)$), reducing transaction overhead across group members by up to 60%.
  - Designed interactive UI components utilizing **Shadcn UI**, **Tailwind CSS**, and **Framer Motion**, delivering responsive layouts, live debt breakdown graphs, settlement history, and real-time toast feedback.
  - Implemented client-side caching and optimistic UI updates using **TanStack React Query**, eliminating redundant network requests and providing sub-100ms UI responses.
  - Built automated recurring expense handlers, pairwise settlement workflows with custom notes, and comprehensive category analytics breakdown.

---

## 🛠️ System Architecture Overview

```
 ┌─────────────────────────────────────────────────────────┐
 │                  React 19 Frontend                      │
 │   (Wouter Router, TanStack Query, Tailwind, Lucide)     │
 └────────────────────────────┬────────────────────────────┘
                              │ REST API (Bearer JWT)
 ┌────────────────────────────▼────────────────────────────┐
 │                  Express.js API Server                  │
 │      (Middlewares: Auth JWT, Logger, CORS, Node-Cache)  │
 └────────────────────────────┬────────────────────────────┘
                              │ ORM Queries
 ┌────────────────────────────▼────────────────────────────┐
 │                 PostgreSQL Database                     │
 │          (Drizzle ORM Schema & Relational Tables)       │
 └─────────────────────────────────────────────────────────┘
```

---

## 🧠 Debt Simplification Algorithm (Min-Cash-Flow)

### Problem:
In a group with $N$ members and multiple transactions, raw balances result in complex circular debts (e.g. $A \rightarrow B \rightarrow C \rightarrow A$).

### Solution:
1. Compute the net balance for each member: $\text{Net}[i] = \text{Total Paid}_i - \text{Total Owed}_i$.
2. Separate members into **Debtors** ($\text{Net} < 0$) and **Creditors** ($\text{Net} > 0$).
3. Sort both lists and greedily match the maximum debtor with the maximum creditor.
4. Settle $\min(|\text{Debtor}|, \text{Creditor})$ and update balances until all debts are 0.
5. Reduces overall transactions from $O(N^2)$ to at most $N-1$ simplified edges.
