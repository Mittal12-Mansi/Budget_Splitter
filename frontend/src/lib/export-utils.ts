import { formatINR } from "./currency";
import { format } from "date-fns";

export interface ExpenseExportItem {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number | string;
  payerName?: string;
  splitType?: string;
  note?: string;
}

export interface MemberBalanceExport {
  name: string;
  email: string;
  totalPaid: number;
  totalOwed: number;
  netBalance: number;
}

export interface PairwiseDebtExport {
  fromName: string;
  toName: string;
  amount: number;
}

/**
 * Downloads expenses as a clean CSV file.
 */
export function exportToCSV(filename: string, rows: Record<string, any>[]) {
  if (!rows || !rows.length) return;

  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const val = row[header] ?? "";
          const escaped = String(val).replace(/"/g, '""');
          return `"${escaped}"`;
        })
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Triggers a formatted PDF print report preview for Group Expenses & Settlements.
 */
export function generateGroupPDFReport({
  groupName,
  description,
  totalExpenses,
  expensesCount,
  membersCount,
  expenses,
  balances,
  debts,
}: {
  groupName: string;
  description?: string;
  totalExpenses: number;
  expensesCount: number;
  membersCount: number;
  expenses: ExpenseExportItem[];
  balances: MemberBalanceExport[];
  debts: PairwiseDebtExport[];
}) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return;

  const currentDate = format(new Date(), "MMMM dd, yyyy - hh:mm a");

  const memberRows = balances
    .map(
      (m) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${m.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${m.email}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #16a34a; font-family: monospace;">${formatINR(m.totalPaid)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #dc2626; font-family: monospace;">${formatINR(m.totalOwed)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-family: monospace; color: ${m.netBalance > 0 ? "#16a34a" : m.netBalance < 0 ? "#dc2626" : "#64748b"};">
        ${m.netBalance > 0 ? "+" : ""}${formatINR(m.netBalance)} (${m.netBalance > 0 ? "gets back" : m.netBalance < 0 ? "owes" : "settled"})
      </td>
    </tr>
  `
    )
    .join("");

  const debtRows = debts.length
    ? debts
        .map(
          (d) => `
    <tr style="background-color: #f8fafc;">
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #dc2626;">${d.fromName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #64748b;">owes</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #16a34a;">${d.toName}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-family: monospace;">${formatINR(d.amount)}</td>
    </tr>
  `
        )
        .join("")
    : `<tr><td colspan="4" style="padding: 12px; text-align: center; color: #64748b;">All group debts are completely settled! 🎉</td></tr>`;

  const expenseRows = expenses
    .map(
      (e) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${e.date ? format(new Date(e.date), "dd MMM yyyy") : "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${e.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${e.category || "General"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${e.payerName || "Group"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-transform: capitalize;">${e.splitType || "equal"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-family: monospace;">${formatINR(typeof e.amount === "number" ? e.amount : parseFloat(e.amount))}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>${groupName} - Financial Summary Report</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #64748b; }
          .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
          .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
          .stat-value { font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
          .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #4f46e5; padding-left: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">⚡ Splitter — Group Expense Report</h1>
            <p class="subtitle">Group: <strong>${groupName}</strong> ${description ? `(${description})` : ""}</p>
          </div>
          <div class="meta">
            <p style="margin: 0;">Generated on:</p>
            <p style="margin: 0; font-weight: 600; color: #334155;">${currentDate}</p>
            <button class="no-print" onclick="window.print()" style="margin-top: 8px; background: #4f46e5; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">🖨️ Print / Save PDF</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Group Spend</div>
            <div class="stat-value" style="color: #4f46e5;">${formatINR(totalExpenses)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Expenses Count</div>
            <div class="stat-value">${expensesCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Group Members</div>
            <div class="stat-value">${membersCount}</div>
          </div>
        </div>

        <div class="section-title">1. Net Member Balances Summary</div>
        <table>
          <thead>
            <tr>
              <th>Member Name</th>
              <th>Email</th>
              <th style="text-align: right;">Total Paid</th>
              <th style="text-align: right;">Total Share</th>
              <th style="text-align: right;">Net Balance</th>
            </tr>
          </thead>
          <tbody>
            ${memberRows}
          </tbody>
        </table>

        <div class="section-title">2. Simplified Pairwise Debt Settlements</div>
        <table>
          <thead>
            <tr>
              <th>From (Payer)</th>
              <th style="text-align: center;">Action</th>
              <th>To (Receiver)</th>
              <th style="text-align: right;">Amount Owed</th>
            </tr>
          </thead>
          <tbody>
            ${debtRows}
          </tbody>
        </table>

        <div class="section-title">3. Itemized Group Expense History</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Paid By</th>
              <th>Split Type</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows}
          </tbody>
        </table>

        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
          Generated automatically by Splitter Expense Management System • http://localhost:5173
        </div>

        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;

  reportWindow.document.write(html);
  reportWindow.document.close();
}

/**
 * Triggers a formatted PDF print report preview for Personal Tracker.
 */
export function generatePersonalPDFReport({
  userName,
  totalSpent,
  monthlySpent,
  expenses,
}: {
  userName: string;
  totalSpent: number;
  monthlySpent: number;
  expenses: ExpenseExportItem[];
}) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return;

  const currentDate = format(new Date(), "MMMM dd, yyyy - hh:mm a");

  const expenseRows = expenses
    .map(
      (e) => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${e.date ? format(new Date(e.date), "dd MMM yyyy") : "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${e.description}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${e.category || "General"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${e.note || "-"}</td>
      <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 700; font-family: monospace; color: #0f172a;">${formatINR(typeof e.amount === "number" ? e.amount : parseFloat(e.amount))}</td>
    </tr>
  `
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Personal Expense Tracker Report - ${userName}</title>
        <style>
          body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #0f172a; margin: 0; padding: 24px; line-height: 1.5; }
          .header { border-bottom: 2px solid #4f46e5; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: 800; color: #4f46e5; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .meta { text-align: right; font-size: 12px; color: #64748b; }
          .stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 24px; }
          .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px; }
          .stat-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; font-weight: 600; }
          .stat-value { font-size: 22px; font-weight: 800; color: #0f172a; margin-top: 4px; font-family: monospace; }
          .section-title { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 24px; margin-bottom: 12px; border-left: 4px solid #4f46e5; padding-left: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; font-weight: 700; color: #334155; border-bottom: 2px solid #cbd5e1; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">⚡ Splitter — Personal Tracker Report</h1>
            <p class="subtitle">User: <strong>${userName}</strong></p>
          </div>
          <div class="meta">
            <p style="margin: 0;">Generated on:</p>
            <p style="margin: 0; font-weight: 600; color: #334155;">${currentDate}</p>
            <button class="no-print" onclick="window.print()" style="margin-top: 8px; background: #4f46e5; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer;">🖨️ Print / Save PDF</button>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Personal Spend</div>
            <div class="stat-value" style="color: #4f46e5;">${formatINR(totalSpent)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Spent This Month</div>
            <div class="stat-value" style="color: #16a34a;">${formatINR(monthlySpent)}</div>
          </div>
        </div>

        <div class="section-title">Itemized Personal Expense History (${expenses.length} Records)</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Category</th>
              <th>Notes</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRows}
          </tbody>
        </table>

        <div style="margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 12px; font-size: 11px; color: #94a3b8; text-align: center;">
          Generated automatically by Splitter Personal Tracker • http://localhost:5173
        </div>

        <script>
          setTimeout(() => { window.print(); }, 500);
        </script>
      </body>
    </html>
  `;

  reportWindow.document.write(html);
  reportWindow.document.close();
}
