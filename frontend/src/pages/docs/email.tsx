import { Link } from "wouter";
import { Mail, Settings, Send, Bell } from "lucide-react";

const emailTypes = [
  {
    type: "Group Invitation",
    trigger: "POST /groups/:id/members",
    icon: "✉️",
    template: `Subject: You've been invited to join "Apartment Expenses"

Hi Carol,

Alice Chen has invited you to join the group "Apartment Expenses" on Smart Budget Splitter.

Click the link below to join:
https://app.example.com/groups/1

— Smart Budget Splitter`,
  },
  {
    type: "Settlement Reminder",
    trigger: "Scheduled job (optional)",
    icon: "🔔",
    template: `Subject: Settlement reminder — you owe $45.00

Hi Bob,

Just a reminder that you owe Alice $45.00 in the group "Tokyo Trip 2026".

View the debt graph:
https://app.example.com/groups/2/debt-graph

— Smart Budget Splitter`,
  },
  {
    type: "Settlement Confirmation",
    trigger: "POST /groups/:id/settlements",
    icon: "✅",
    template: `Subject: Payment recorded — Bob paid Alice $45.00

Hi Alice,

Bob has recorded a payment of $45.00 to you in "Tokyo Trip 2026".

Your updated balance is $0.00.

— Smart Budget Splitter`,
  },
];

const nodemailerConfig = `import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   parseInt(process.env.SMTP_PORT ?? "587"),
  secure: process.env.SMTP_PORT === "465",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail(to: string, subject: string, text: string) {
  await transporter.sendMail({
    from: \`"Smart Budget Splitter" <\${process.env.SMTP_FROM}>\`,
    to, subject, text,
  });
}`;

const smtpVars = [
  { key: "SMTP_HOST", example: "smtp.gmail.com", description: "SMTP server hostname" },
  { key: "SMTP_PORT", example: "587", description: "SMTP port (587 = STARTTLS, 465 = SSL)" },
  { key: "SMTP_USER", example: "app@example.com", description: "SMTP authentication username" },
  { key: "SMTP_PASS", example: "your-app-password", description: "SMTP password or app-specific password" },
  { key: "SMTP_FROM", example: "noreply@example.com", description: "Sender address shown to recipients" },
];

export default function DocsEmail() {
  return (
    <div className="max-w-3xl mx-auto py-10 px-4 space-y-10">
      <div>
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          ← Back to Docs
        </Link>
        <h1 className="text-3xl font-bold mt-3 tracking-tight">Email Notifications</h1>
        <p className="text-muted-foreground mt-2">
          SMTP email workflow for group invitations, settlement confirmations, and reminders.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
        <strong>Note:</strong> Email sending requires SMTP credentials configured as environment variables.
        In development, you can use <a href="https://mailtrap.io" className="underline" target="_blank">Mailtrap</a> or
        <a href="https://ethereal.email" className="underline mx-1" target="_blank">Ethereal</a> to catch emails without sending.
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Nodemailer Configuration</h2>
        <pre className="text-xs font-mono bg-muted/40 border rounded-xl p-5 overflow-x-auto whitespace-pre-wrap">{nodemailerConfig}</pre>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Bell className="h-5 w-5" /> Email Types</h2>
        <div className="space-y-4">
          {emailTypes.map((e) => (
            <div key={e.type} className="border rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{e.icon}</span>
                <div>
                  <h3 className="font-semibold">{e.type}</h3>
                  <p className="text-xs text-muted-foreground font-mono">Triggered by: {e.trigger}</p>
                </div>
              </div>
              <div className="bg-muted/40 rounded-lg p-4 text-xs font-mono whitespace-pre-wrap border">{e.template}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Send className="h-5 w-5" /> Delivery Flow</h2>
        <div className="border rounded-xl overflow-hidden">
          {[
            { step: "1", label: "Mutation completes", detail: "User is added to group (or settlement is recorded)" },
            { step: "2", label: "Email service called", detail: "Route handler calls sendGroupInviteEmail(user, group)" },
            { step: "3", label: "Template rendered", detail: "Plain text (or HTML) email is composed with relevant data" },
            { step: "4", label: "Nodemailer sends", detail: "transporter.sendMail() connects to SMTP and delivers" },
            { step: "5", label: "SMTP relay", detail: "Your SMTP provider (Gmail, SendGrid, AWS SES) handles actual delivery" },
            { step: "6", label: "Recipient inbox", detail: "Email arrives in the recipient's inbox within seconds" },
          ].map((row, i) => (
            <div key={row.step} className="flex items-start gap-4 px-5 py-3 border-b border-border/50 last:border-0 hover:bg-muted/20 transition-colors">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{row.step}</span>
              <div>
                <div className="font-medium text-sm">{row.label}</div>
                <div className="text-xs text-muted-foreground">{row.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Settings className="h-5 w-5" /> Environment Variables</h2>
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60 border-b border-border">
                <th className="text-left px-4 py-2.5 font-semibold text-xs">Variable</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs">Example</th>
                <th className="text-left px-4 py-2.5 font-semibold text-xs">Description</th>
              </tr>
            </thead>
            <tbody>
              {smtpVars.map((v) => (
                <tr key={v.key} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2.5 font-mono text-xs text-primary font-medium">{v.key}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{v.example}</td>
                  <td className="px-4 py-2.5 text-xs text-muted-foreground">{v.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
