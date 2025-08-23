import { pgTable, text, serial, integer, boolean, decimal, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const investors = pgTable("investors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company").notNull(),
  fund: text("fund"), // Fund name from funds table
  position: text("position"),
  positionType: text("position_type"), // PM, Buyside Analyst, Other
  specialty: text("specialty").array().default([]), // Combined industry and regional specialties
  ownsOurShare: text("owns_our_share"), // Yes, No
  shareAmount: text("share_amount"), // amount owned if ownsOurShare is Yes
  note: text("note"), // free text field for any notes
  avatarInitials: text("avatar_initials"),
  country: text("country").default("Korea"), // Korea, US, UK, Japan, Singapore, Other
  language: text("language").default("Korean"), // Korean, English, Japanese
  timezone: text("timezone").default("Asia/Seoul"),
  // Portfolio management fields (from fund manager data)
  totalExperience: text("total_experience"), // 총 운용경력 (e.g., "10년7개월")
  currentCompanyExperience: text("current_company_experience"), // 현회사 운용경력
  managedFundAum: decimal("managed_fund_aum", { precision: 20, scale: 2 }), // 운용펀드AUM (백만원)
  numberOfManagedFunds: integer("number_of_managed_funds"), // 운용펀드수
  totalAssets: decimal("total_assets", { precision: 20, scale: 2 }), // 설정원본 (백만원)
});

export const overseasInvestors = pgTable("overseas_investors", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"),
  company: text("company").notNull(),
  fund: text("fund"), // Fund name from funds table
  position: text("position"),
  positionType: text("position_type"), // PM, Buyside Analyst, Other
  specialty: text("specialty").array().default([]), // Combined industry and regional specialties
  ownsOurShare: text("owns_our_share"), // Yes, No
  shareAmount: text("share_amount"), // amount owned if ownsOurShare is Yes
  note: text("note"), // free text field for any notes
  avatarInitials: text("avatar_initials"),
  country: text("country").default("Korea"), // Korea, US, UK, Japan, Singapore, Other
  language: text("language").default("Korean"), // Korean, English, Japanese
  timezone: text("timezone").default("Asia/Seoul"),
  // New portfolio management fields
  totalExperience: integer("total_experience"), // 총운용경력 (years)
  currentCompanyExperience: integer("current_company_experience"), // 현회사운용경력 (years)
  managedFundAum: decimal("managed_fund_aum", { precision: 20, scale: 2 }), // 운용펀드AUM
  numberOfManagedFunds: integer("number_of_managed_funds"), // 운용펀드수
});

export const analysts = pgTable("analysts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").default(""),
  company: text("company").notNull(),
  position: text("position").default(""),
  specialization: text("specialization").array().default([]), // Tech, Healthcare, Finance, etc.
  coverage: text("coverage").default(""), // sectors/companies covered
  language: text("language").default("Korean"), // Korean, English, Japanese
  country: text("country").default("Korea"), // Korea, US, UK, Japan, Singapore, Other
  status: text("status").default("active"), // active, inactive
  notes: text("notes").default(""),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull(),
  status: text("status").default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  category: text("category").default("General"),
  description: text("description"),
  uploadedBy: text("uploaded_by").default("System"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hqLocation: text("hq_location").notNull(),
  aum: decimal("aum", { precision: 20, scale: 2 }).notNull(),
  aumKrw: decimal("aum_krw", { precision: 20, scale: 2 }), // AUM in Korean Won (trillion)
  type: text("type").notNull(), // VC, PE, Hedge Fund, etc.
  area: text("area"), // US, EU, Hong Kong, Singapore, Korea, Other
  shareholderStatus: text("shareholder_status").default("N/A"), // Yes, No, N/A
  shareCount: text("share_count"), // Number of shares if shareholderStatus is Yes
  // New fields for Korean companies
  fundManagerCount: integer("fund_manager_count"), // 펀드 매니저수
  establishedDate: date("established_date"), // 설립일자
  address: text("address"), // 주소
  phone: text("phone"), // TEL
  website: text("website"), // WEB주소
  status: text("status").notNull().default("active"), // active, archived
});

export const overseasCompanies = pgTable("overseas_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  hqLocation: text("hq_location").notNull(),
  aum: decimal("aum", { precision: 20, scale: 2 }).notNull(),
  aumKrw: decimal("aum_krw", { precision: 20, scale: 2 }), // AUM in Korean Won (trillion)
  type: text("type").notNull(), // VC, PE, Hedge Fund, etc.
  area: text("area"), // US, EU, Hong Kong, Singapore, Korea, Other
  shareholderStatus: text("shareholder_status").default("N/A"), // Yes, No, N/A
  shareCount: text("share_count"), // Number of shares if shareholderStatus is Yes
  status: text("status").notNull().default("active"), // active, archived
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
  attendeeType: text("attendee_type").notNull(), // investor, analyst, other
  investorIds: text("investor_ids").array(), // Array of investor IDs for multiple investor meetings
  analystId: integer("analyst_id"), // Backward compatibility - will be deprecated
  analystIds: text("analyst_ids").array(), // Array of analyst IDs for multiple analyst meetings
  ndrConferenceId: integer("ndr_conference_id"), // Optional - for NDR/Conference meetings
  title: text("title").notNull(),
  description: text("description"),
  scheduledDate: timestamp("scheduled_date").notNull(),
  duration: integer("duration").default(60), // duration in minutes
  location: text("location"), // meeting location
  meetingCategory: text("meeting_category"), // 내방, Conference Call, 국내CorpDay, 국내NDR, 해외CorpDay, 해외NDR, 기타
  status: text("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  // Meeting minutes/documents fields
  minutesFilePath: text("minutes_file_path"), // Path to uploaded meeting minutes file
  minutesFileName: text("minutes_file_name"), // Original filename of the minutes
  minutesFileSize: integer("minutes_file_size"), // File size in bytes
  minutesUploadedAt: timestamp("minutes_uploaded_at"), // When the minutes were uploaded
});

export const funds = pgTable("funds", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  companyId: integer("company_id").references(() => companies.id).notNull(),
  aum: text("aum").notNull(), // Store as string to handle large numbers
  type: text("type").notNull(), // Value, Growth, GARP, Other
  ownOurShares: boolean("own_our_shares").notNull().default(false),
  shareAmount: text("share_amount"), // Optional, only when ownOurShares is true
  createdAt: timestamp("created_at").defaultNow(),
});

export const meetingLogs = pgTable("meeting_logs", {
  id: serial("id").primaryKey(),
  date: timestamp("date").notNull(),
  investorId: integer("investor_id").references(() => investors.id).notNull(),
  place: text("place").notNull(), // NDR/Conference, InOffice, Other
  createdAt: timestamp("created_at").defaultNow(),
});

export const ndrConferences = pgTable("ndr_conferences", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  conferenceType: text("conference_type").notNull().default("국내NDR"), // 국내NDR, 국내CorpDay, 해외NDR, 해외CorpDay
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  place: text("place").notNull(),
  cityHeld: text("city_held").notNull(),
  hostCompany: text("host_company").notNull(),
  participatingCompanies: text("participating_companies").array().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

export const otherEvents = pgTable("other_events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  eventType: text("event_type").notNull(), // Roadshow, Workshop, Conference, Meeting, Other
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  location: text("location").notNull(),
  organizer: text("organizer").notNull(),
  description: text("description"),
  attendees: text("attendees").array().default([]), // List of attendee names/companies
  status: text("status").notNull().default("scheduled"), // scheduled, ongoing, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  language: text("language").notNull(), // Korean, English, Japanese
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  variables: text("variables").array(), // {{investorName}}, {{companyName}}, etc.
  templateType: text("template_type").notNull(), // earnings_report, announcement, newsletter
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  templateId: integer("template_id").notNull(),
  targetType: text("target_type").default("region"), // region, specific
  targetRegion: text("target_region"), // Korea, International, All
  targetLanguage: text("target_language"), // Korean, English, All
  specificInvestorIds: text("specific_investor_ids"), // JSON array of investor IDs
  specificAnalystIds: text("specific_analyst_ids"), // JSON array of analyst IDs
  sentCount: integer("sent_count").default(0),
  deliveredCount: integer("delivered_count").default(0),
  status: text("status").default("draft"), // draft, sending, completed, failed
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const securitiesFirms = pgTable("securities_firms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone").notNull(),
  website: text("website"),
  status: text("status").notNull().default("active"), // active, archived
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  recipientEmail: text("recipient_email").notNull(),
  recipientName: text("recipient_name").notNull(),
  recipientType: text("recipient_type").notNull(), // investor, analyst
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  status: text("status").notNull().default("sent"), // sent, failed, delivered
  sentAt: timestamp("sent_at").defaultNow(),
  documentAttached: text("document_attached"), // document name if attached
  region: text("region"), // Korea, International, etc.
  language: text("language").default("Korean"), // Korean, English
});

export const insertInvestorSchema = createInsertSchema(investors).omit({
  id: true,
});

export const insertOverseasInvestorSchema = createInsertSchema(overseasInvestors).omit({
  id: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
});

export const insertOverseasCompanySchema = createInsertSchema(overseasCompanies).omit({
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
}).extend({
  scheduledDate: z.union([z.date(), z.string()]).transform((val) => 
    typeof val === 'string' ? new Date(val) : val
  ),
  attendeeType: z.enum(["investor", "analyst", "other"]),
  investorIds: z.array(z.string()).optional().nullable(),
  analystId: z.number().optional().nullable(),
  ndrConferenceId: z.number().optional().nullable(),
  meetingCategory: z.enum(["내방", "Conference Call", "국내CorpDay", "국내NDR", "해외CorpDay", "해외NDR", "기타"]).optional(),
  location: z.string().optional(),
});

export const insertFundSchema = createInsertSchema(funds).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingLogSchema = createInsertSchema(meetingLogs).omit({
  id: true,
  createdAt: true,
});

export const insertNdrConferenceSchema = createInsertSchema(ndrConferences).omit({
  id: true,
  createdAt: true,
});

export const insertOtherEventSchema = createInsertSchema(otherEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns).omit({
  id: true,
  createdAt: true,
});

export const insertAnalystSchema = createInsertSchema(analysts).omit({
  id: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSecuritiesFirmSchema = createInsertSchema(securitiesFirms).omit({
  id: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({
  id: true,
  sentAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;


export type InsertInvestor = z.infer<typeof insertInvestorSchema>;
export type Investor = typeof investors.$inferSelect;

export type InsertOverseasInvestor = z.infer<typeof insertOverseasInvestorSchema>;
export type OverseasInvestor = typeof overseasInvestors.$inferSelect;

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertOverseasCompany = z.infer<typeof insertOverseasCompanySchema>;
export type OverseasCompany = typeof overseasCompanies.$inferSelect;

export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;
export type Investment = typeof investments.$inferSelect;

export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

export type InsertMeeting = z.infer<typeof insertMeetingSchema>;
export type Meeting = typeof meetings.$inferSelect;

export type InsertFund = z.infer<typeof insertFundSchema>;
export type Fund = typeof funds.$inferSelect;

export type InsertMeetingLog = z.infer<typeof insertMeetingLogSchema>;
export type MeetingLog = typeof meetingLogs.$inferSelect;

export type InsertNdrConference = z.infer<typeof insertNdrConferenceSchema>;
export type NdrConference = typeof ndrConferences.$inferSelect;

export type InsertOtherEvent = z.infer<typeof insertOtherEventSchema>;
export type OtherEvent = typeof otherEvents.$inferSelect;

export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailTemplate = typeof emailTemplates.$inferSelect;

export type InsertEmailCampaign = z.infer<typeof insertEmailCampaignSchema>;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;

export type InsertAnalyst = z.infer<typeof insertAnalystSchema>;
export type Analyst = typeof analysts.$inferSelect;

export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

export type InsertSecuritiesFirm = z.infer<typeof insertSecuritiesFirmSchema>;
export type SecuritiesFirm = typeof securitiesFirms.$inferSelect;

export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
