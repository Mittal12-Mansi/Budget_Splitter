# 💸 Smart Budget Splitter & Personal Finance Manager

> A modern, full-stack expense splitting, loan interest calculator, and personal wealth management platform. Built with **React 19**, **TypeScript**, **Express**, **PostgreSQL**, and **Tailwind CSS v4**.

---

## ✨ Feature Highlights

| Feature | Highlight | Key Capabilities |
| :--- | :--- | :--- |
| ⚡ **Smart Debt Splitting** | Algorithmic Cash Graph | Equal, custom & % splits • Pairwise debt graph reduction to minimize transactions |
| 📱 **UPI App Deep-Linking** | 1-Click Instant Pay | Direct `upi://pay` deep-links for GPay, PhonePe & Paytm with copyable UPI IDs |
| 💬 **WhatsApp & SMS Invites** | Clickable Direct Links | Phone-first member invites via `wa.me` & `sms:` with target group URLs |
| 💳 **EMI & Loan Manager** | Interest Calculators | Track Phone/Car EMIs with 0% No-Cost, Simple, or Compound interest & due banners |
| 🧾 **Bill & Receipt Upload** | Visual Verification | Attach physical bill photos with interactive full-screen zoom modal |
| 📊 **CSV & PDF Exports** | Printable Reports | 1-click `.csv` spreadsheet export & printable PDF summary reports |

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

## ⚙️ Quickstart / Setup

### 1. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Mittal12-Mansi/Budget_Splitter.git
cd Budget_Splitter
pnpm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create `.env`:
```bash
cp .env.example .env
```
Set your PostgreSQL connection string in `.env`:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/budget_splitter
JWT_SECRET=your_super_secret_jwt_key
PORT=5000
```

### 3. Run Database Push & Start Local Dev Server
```bash
pnpm run db:push
pnpm run dev
```
- **Frontend App**: `http://localhost:5173/`
- **Backend API**: `http://localhost:5000/`

---

## 📄 License
Distributed under the **MIT License**.
