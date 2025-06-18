import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const investors = pgTable("investors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company").notNull(),
  position: text("position"),
  status: text("status").notNull().default("active"), // active, inactive, prospect
  avatarInitials: text("avatar_initials"),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hqLocation: text("hq_location").notNull(),
  aum: decimal("aum", { precision: 15, scale: 2 }).notNull(),
  type: text("type").notNull(), // VC, PE, Hedge Fund, etc.
  area: text("area"), // US, EU, Hong Kong, Singapore, Other
});

export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  companyId: integer("company_id"),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  round: text("round").notNull(), // seed, series-a, series-b, etc.
  status: text("status").notNull().default("active"), // active, in-review, closed
  investmentDate: timestamp("investment_date"),
});

export const communications = pgTable("communications", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  type: text("type").notNull(), // email, call, meeting
  subject: text("subject").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  status: text("status").default("completed"), // scheduled, completed, cancelled
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  investorId: integer("investor_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
});

export const insertInvestorSchema = createInsertSchema(investors).omit({
  id: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export const insertInvestmentSchema = createInsertSchema(investments).omit({
  id: true,
});

export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
});

export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investors.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;
