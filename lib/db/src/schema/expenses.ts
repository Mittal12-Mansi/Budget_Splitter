import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { groupsTable } from "./groups";

export const expensesTable = pgTable("expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  payerId: integer("payer_id").notNull().references(() => usersTable.id),
  splitType: text("split_type").notNull().default("equal"),
  category: text("category"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const expenseSplitsTable = pgTable("expense_splits", {
  id: serial("id").primaryKey(),
  expenseId: integer("expense_id").notNull().references(() => expensesTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
});

export const settlementsTable = pgTable("settlements", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  payerId: integer("payer_id").notNull().references(() => usersTable.id),
  receiverId: integer("receiver_id").notNull().references(() => usersTable.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationsTable = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // "expense_added" | "settlement_made" | "debt_reminder" | "member_added"
  title: text("title").notNull(),
  message: text("message").notNull(),
  groupId: integer("group_id").references(() => groupsTable.id, { onDelete: "cascade" }),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notificationsTable.$inferSelect;

export const insertExpenseSchema = createInsertSchema(expensesTable).omit({ id: true, createdAt: true });
export const insertSplitSchema = createInsertSchema(expenseSplitsTable).omit({ id: true });
export const insertSettlementSchema = createInsertSchema(settlementsTable).omit({ id: true, createdAt: true });

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expensesTable.$inferSelect;
export type ExpenseSplit = typeof expenseSplitsTable.$inferSelect;
export type Settlement = typeof settlementsTable.$inferSelect;
