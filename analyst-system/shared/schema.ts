import { pgTable, text, serial, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Organizations table - minimal for analyst system
export const organizations = pgTable("organizations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(), // 회사명
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Analysts table - for analyst information
export const analysts = pgTable("analysts", {
  id: serial("id").primaryKey(),
  organizationId: integer("organization_id").references(() => organizations.id),
  name: text("name").notNull(), // 애널리스트 이름
  email: text("email"),
  phone: text("phone"),
  company: text("company").notNull(), // 증권사
  department: text("department"), // 부서
  sector: text("sector").array().default([]), // 담당 섹터
  note: text("note"), // 메모
});

// Analyst Reports table - main table for analyst reports
export const analystReports = pgTable('analyst_reports', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id),
  analystId: integer('analyst_id').notNull().references(() => analysts.id),
  title: text('title'),
  originalFileName: text('original_file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  fileType: text('file_type').notNull(),
  description: text('description'), // 우려사항
  contentText: text('content_text'), // 긍정적 요인
  targetPrice: text('target_price'), // 목표주가
  publishDate: date('publish_date'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Schema types and validations
export const insertOrganizationSchema = createInsertSchema(organizations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAnalystSchema = createInsertSchema(analysts).omit({
  id: true,
});

export const insertAnalystReportSchema = createInsertSchema(analystReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertOrganization = z.infer<typeof insertOrganizationSchema>;
export type Organization = typeof organizations.$inferSelect;

export type InsertAnalyst = z.infer<typeof insertAnalystSchema>;
export type Analyst = typeof analysts.$inferSelect;

export type InsertAnalystReport = z.infer<typeof insertAnalystReportSchema>;
export type AnalystReport = typeof analystReports.$inferSelect;