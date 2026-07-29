import { pgTable, serial, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { groupsTable } from "./groups";

export const personalExpensesTable = pgTable("personal_expenses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  category: text("category").notNull().default("Other"),
  note: text("note"),
  date: timestamp("date").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const recurringExpensesTable = pgTable("recurring_expenses", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  payerId: integer("payer_id").notNull().references(() => usersTable.id),
  splitType: text("split_type").notNull().default("equal"),
  category: text("category"),
  frequency: text("frequency").notNull().default("monthly"),
  dayOfMonth: integer("day_of_month").notNull().default(1),
  isActive: boolean("is_active").notNull().default(true),
  lastGeneratedAt: timestamp("last_generated_at"),
  nextDueAt: timestamp("next_due_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPersonalExpenseSchema = createInsertSchema(personalExpensesTable).omit({ id: true, createdAt: true });
export const insertRecurringExpenseSchema = createInsertSchema(recurringExpensesTable).omit({ id: true, createdAt: true, lastGeneratedAt: true });

export type PersonalExpense = typeof personalExpensesTable.$inferSelect;
export type RecurringExpense = typeof recurringExpensesTable.$inferSelect;
export type InsertPersonalExpense = z.infer<typeof insertPersonalExpenseSchema>;
export type InsertRecurringExpense = z.infer<typeof insertRecurringExpenseSchema>;
