# 💸 Smart Budget Splitter & Personal Finance Manager

A modern, full-stack expense splitting and personal wealth management application. Built with **React 19**, **TypeScript**, **Express**, **PostgreSQL**, and **Tailwind CSS v4**.

---

## ✨ Key Features

### 👥 **Group Expense Splitting & Debt Simplification**
- **Flexible Expense Splits**: Split expenses equally, by exact custom amounts, or by percentage.
- **Pairwise Debt Graph Simplification**: Algorithmic debt graph reduction to minimize total cash transfers between group members.
- **Live Net Balance Calculation**: Real-time balance tracking showing who gets money back and who owes money.

### 📱 **UPI Payment Deep-Linking (GPay / PhonePe / Paytm)**
- **Direct UPI App Integration**: Instant `upi://pay` deep-linking to launch Google Pay, PhonePe, or Paytm directly with pre-filled receiver UPI ID and transfer amount.
- **Copyable UPI IDs & Phone Numbers**: 1-click copy functionality with toast notifications.

### 💬 **WhatsApp & Native SMS Invitations**
- **Phone-First Onboarding**: Add members using Full Name and Phone Number (email address is 100% optional).
- **Clickable Invite Links**: Generates interactive WhatsApp (`wa.me`) and SMS (`sms:`) links with pre-filled message text and target group URLs.

### 💳 **Personal Tracker & EMI / Loan Interest Manager**
- **Private Expense Tracking**: Track personal day-to-day spending with visual category breakdown charts.
- **EMI & Bank Loan Calculator**: Manage phone, car, or home loans with 0% No-Cost EMI, Simple Interest, or Compound Interest calculations.
- **Due Date Alert Banners**: Countdown notification banners for upcoming EMIs and personal debt due dates.
- **Payment Logging**: Record partial or full payments with timestamped transaction histories.

### 🧾 **Bill & Receipt Image Attachment**
- **Receipt Image Upload**: Attach physical bill photos or digital receipt images to any group or personal expense.
- **Full-Screen Zoom Viewer**: View high-resolution receipts inside an interactive full-screen modal.

### 📄 **CSV Spreadsheet & PDF Report Exports**
- **1-Click Export CSV**: Download structured `.csv` spreadsheets of group transactions or personal spending.
- **Printable PDF Reports**: Generate executive summary PDF documents with member balance tables and debt transfers.

---

## 🖼️ User Interface Showcase

### 📊 **Dashboard Overview**
![Dashboard UI](docs/images/dashboard.png)

### 👥 **Groups Workspace**
![Groups UI](docs/images/groups.png)

### 📈 **Personal Tracker & Analytics**
![Personal Tracker UI](docs/images/personal_tracker.png)

---

## 🛠️ Tech Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Wouter, Lucide Icons, Recharts, TanStack Query |
| **Backend** | Node.js, Express, TypeScript, Drizzle ORM, Pino Logger |
| **Database** | PostgreSQL |
| **Tooling & Monorepo** | pnpm Workspaces, Zod, Orval API Generator, bcryptjs |

---

## ⚙️ Quickstart / Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **pnpm** (v8 or higher)
- **PostgreSQL** database instance

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/budget-splitter.git
cd budget-splitter
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Update `.env` with your PostgreSQL database credentials:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/budget_splitter
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

### 3. Run Database Migrations
```bash
pnpm run db:push
```

### 4. Start Local Development Server
```bash
pnpm run dev
```
- **Frontend App**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5000/`

---

## 📄 License
Distributed under the **MIT License**.
