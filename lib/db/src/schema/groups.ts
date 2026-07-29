import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const groupsTable = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  currency: text("currency").notNull().default("INR"),
  ownerId: integer("owner_id").notNull().references(() => usersTable.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const membershipsTable = pgTable("memberships", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groupsTable.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  role: text("role").notNull().default("member"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const insertGroupSchema = createInsertSchema(groupsTable).omit({ id: true, createdAt: true });
export const insertMembershipSchema = createInsertSchema(membershipsTable).omit({ id: true, joinedAt: true });
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Group = typeof groupsTable.$inferSelect;
export type Membership = typeof membershipsTable.$inferSelect;
