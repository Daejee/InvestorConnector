import { 
  investors, overseasInvestors, companies, overseasCompanies, investments, communications, meetings, funds, overseasFunds, meetingLogs, ndrConferences, otherEvents, emailTemplates, emailCampaigns, analysts, documents, securitiesFirms, emailLogs, users, organizations,
  type Investor, type InsertInvestor, type OverseasInvestor, type InsertOverseasInvestor,
  type Company, type InsertCompany, type OverseasCompany, type InsertOverseasCompany,
  type Investment, type InsertInvestment,
  type Communication, type InsertCommunication,
  type Meeting, type InsertMeeting,
  type Fund, type InsertFund, type OverseasFund, type InsertOverseasFund,
  type MeetingLog, type InsertMeetingLog,
  type NdrConference, type InsertNdrConference,
  type OtherEvent, type InsertOtherEvent,
  type EmailTemplate, type InsertEmailTemplate,
  type EmailCampaign, type InsertEmailCampaign,
  type Analyst, type InsertAnalyst,
  type Document, type InsertDocument,
  type SecuritiesFirm, type InsertSecuritiesFirm,
  type EmailLog, type InsertEmailLog,
  type User, type InsertUser,
  type Organization, type InsertOrganization
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Investors
  getInvestors(organizationId: number): Promise<Investor[]>;
  getInvestor(id: number, organizationId: number): Promise<Investor | undefined>;
  getInvestorByEmail(email: string, organizationId: number): Promise<Investor | undefined>;
  createInvestor(investor: InsertInvestor, organizationId: number): Promise<Investor>;
  updateInvestor(id: number, investor: Partial<InsertInvestor>, organizationId: number): Promise<Investor | undefined>;
  deleteInvestor(id: number, organizationId: number): Promise<boolean>;
  clearAllEmails(): Promise<void>;

  // Overseas Investors
  getOverseasInvestors(): Promise<OverseasInvestor[]>;
  getOverseasInvestor(id: number): Promise<OverseasInvestor | undefined>;
  getOverseasInvestorByEmail(email: string): Promise<OverseasInvestor | undefined>;
  createOverseasInvestor(investor: InsertOverseasInvestor): Promise<OverseasInvestor>;
  updateOverseasInvestor(id: number, investor: Partial<InsertOverseasInvestor>): Promise<OverseasInvestor | undefined>;
  deleteOverseasInvestor(id: number): Promise<boolean>;

  // Companies
  getCompanies(organizationId: number): Promise<Company[]>;
  getCompany(id: number, organizationId: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany, organizationId: number): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>, organizationId: number): Promise<Company | undefined>;
  deleteCompany(id: number, organizationId: number): Promise<boolean>;

  // Overseas Companies
  getOverseasCompanies(organizationId: number): Promise<OverseasCompany[]>;
  getOverseasCompany(id: number): Promise<OverseasCompany | undefined>;
  createOverseasCompany(company: InsertOverseasCompany): Promise<OverseasCompany>;
  updateOverseasCompany(id: number, company: Partial<InsertOverseasCompany>): Promise<OverseasCompany | undefined>;
  deleteOverseasCompany(id: number): Promise<boolean>;

  // Investments
  getInvestments(): Promise<Investment[]>;
  getInvestment(id: number): Promise<Investment | undefined>;
  getInvestmentsByInvestor(investorId: number): Promise<Investment[]>;
  createInvestment(investment: InsertInvestment): Promise<Investment>;
  updateInvestment(id: number, investment: Partial<InsertInvestment>): Promise<Investment | undefined>;
  deleteInvestment(id: number): Promise<boolean>;

  // Communications
  getCommunications(): Promise<Communication[]>;
  getCommunication(id: number): Promise<Communication | undefined>;
  getCommunicationsByInvestor(investorId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  updateCommunication(id: number, communication: Partial<InsertCommunication>): Promise<Communication | undefined>;
  deleteCommunication(id: number): Promise<boolean>;

  // Meetings
  getMeetings(organizationId: number): Promise<Meeting[]>;
  getMeeting(id: number, organizationId: number): Promise<Meeting | undefined>;
  getMeetingsByInvestor(investorId: number, organizationId: number): Promise<Meeting[]>;
  getUpcomingMeetings(organizationId: number): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting, organizationId: number): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>, organizationId: number): Promise<Meeting | undefined>;
  deleteMeeting(id: number, organizationId: number): Promise<boolean>;
  updateMeetingMinutes(meetingId: number, minutesData: {
    minutesFilePath: string;
    minutesFileName: string;
    minutesFileSize: number;
    minutesUploadedAt: Date;
  }): Promise<Meeting | undefined>;

  // Funds
  getFunds(): Promise<Fund[]>;
  getFund(id: number): Promise<Fund | undefined>;
  getFundsByCompany(companyId: number): Promise<Fund[]>;
  createFund(fund: InsertFund): Promise<Fund>;
  updateFund(id: number, fund: Partial<InsertFund>): Promise<Fund | undefined>;
  deleteFund(id: number): Promise<boolean>;

  // Overseas Funds
  getOverseasFunds(organizationId: number): Promise<OverseasFund[]>;
  getOverseasFund(id: number, organizationId: number): Promise<OverseasFund | undefined>;
  createOverseasFund(fund: InsertOverseasFund, organizationId: number): Promise<OverseasFund>;
  updateOverseasFund(id: number, fund: Partial<InsertOverseasFund>, organizationId: number): Promise<OverseasFund | undefined>;
  deleteOverseasFund(id: number, organizationId: number): Promise<boolean>;

  // Meeting Logs
  getMeetingLogs(): Promise<MeetingLog[]>;
  getMeetingLog(id: number): Promise<MeetingLog | undefined>;
  getMeetingLogsByInvestor(investorId: number): Promise<MeetingLog[]>;
  createMeetingLog(meetingLog: InsertMeetingLog): Promise<MeetingLog>;
  updateMeetingLog(id: number, meetingLog: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined>;
  deleteMeetingLog(id: number): Promise<boolean>;

  // NDR/Conferences
  getNdrConferences(): Promise<NdrConference[]>;
  getNdrConference(id: number): Promise<NdrConference | undefined>;
  createNdrConference(ndrConference: InsertNdrConference): Promise<NdrConference>;
  updateNdrConference(id: number, ndrConference: Partial<InsertNdrConference>): Promise<NdrConference | undefined>;
  deleteNdrConference(id: number): Promise<boolean>;

  // Other Events
  getOtherEvents(): Promise<OtherEvent[]>;
  getOtherEvent(id: number): Promise<OtherEvent | undefined>;
  createOtherEvent(otherEvent: InsertOtherEvent): Promise<OtherEvent>;
  updateOtherEvent(id: number, otherEvent: Partial<InsertOtherEvent>): Promise<OtherEvent | undefined>;
  deleteOtherEvent(id: number): Promise<boolean>;

  // Email Templates
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  getEmailTemplatesByLanguage(language: string): Promise<EmailTemplate[]>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, template: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;

  // Email Campaigns
  getEmailCampaigns(): Promise<EmailCampaign[]>;
  getEmailCampaign(id: number): Promise<EmailCampaign | undefined>;
  createEmailCampaign(campaign: InsertEmailCampaign): Promise<EmailCampaign>;
  updateEmailCampaign(id: number, campaign: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined>;

  // Analysts
  getAnalysts(organizationId: number): Promise<Analyst[]>;
  getAnalyst(id: number, organizationId: number): Promise<Analyst | undefined>;
  getAnalystByEmail(email: string, organizationId: number): Promise<Analyst | undefined>;
  createAnalyst(analyst: InsertAnalyst, organizationId: number): Promise<Analyst>;
  updateAnalyst(id: number, analyst: Partial<InsertAnalyst>, organizationId: number): Promise<Analyst | undefined>;
  deleteAnalyst(id: number, organizationId: number): Promise<boolean>;

  // Documents
  getDocuments(): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByCategory(category: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: number, document: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number): Promise<boolean>;

  // Securities Firms
  getSecuritiesFirms(): Promise<SecuritiesFirm[]>;
  getSecuritiesFirm(id: number): Promise<SecuritiesFirm | undefined>;
  createSecuritiesFirm(firm: InsertSecuritiesFirm): Promise<SecuritiesFirm>;
  updateSecuritiesFirm(id: number, firm: Partial<InsertSecuritiesFirm>): Promise<SecuritiesFirm | undefined>;
  deleteSecuritiesFirm(id: number): Promise<boolean>;

  // Email Logs
  getEmailLogs(): Promise<EmailLog[]>;
  getEmailLog(id: number): Promise<EmailLog | undefined>;
  createEmailLog(emailLog: InsertEmailLog): Promise<EmailLog>;
  getEmailLogsByRecipient(email: string): Promise<EmailLog[]>;

  // Users
  getUsers(): Promise<User[]>;
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

}

export class DatabaseStorage implements IStorage {
  // Investors
  async getInvestors(organizationId: number): Promise<Investor[]> {
    return await db.select().from(investors).where(eq(investors.organizationId, organizationId));
  }

  async getInvestor(id: number, organizationId: number): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(
      sql`${investors.id} = ${id} AND ${investors.organizationId} = ${organizationId}`
    );
    return investor || undefined;
  }

  async getInvestorByEmail(email: string, organizationId: number): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(
      sql`${investors.email} = ${email} AND ${investors.organizationId} = ${organizationId}`
    );
    return investor || undefined;
  }

  async createInvestor(insertInvestor: InsertInvestor, organizationId: number): Promise<Investor> {
    const [investor] = await db
      .insert(investors)
      .values({ ...insertInvestor, organizationId })
      .returning();
    return investor;
  }

  async updateInvestor(id: number, updateData: Partial<InsertInvestor>, organizationId: number): Promise<Investor | undefined> {
    const [investor] = await db
      .update(investors)
      .set(updateData)
      .where(sql`${investors.id} = ${id} AND ${investors.organizationId} = ${organizationId}`)
      .returning();
    return investor || undefined;
  }

  async deleteInvestor(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(investors).where(
      sql`${investors.id} = ${id} AND ${investors.organizationId} = ${organizationId}`
    );
    return result.rowCount! > 0;
  }

  async clearAllEmails(): Promise<void> {
    await db
      .update(investors)
      .set({ email: '' })
      .execute();
  }

  // Overseas Investors
  async getOverseasInvestors(): Promise<OverseasInvestor[]> {
    return await db.select().from(overseasInvestors);
  }

  async getOverseasInvestor(id: number): Promise<OverseasInvestor | undefined> {
    const [investor] = await db.select().from(overseasInvestors).where(eq(overseasInvestors.id, id));
    return investor || undefined;
  }

  async getOverseasInvestorByEmail(email: string): Promise<OverseasInvestor | undefined> {
    const [investor] = await db.select().from(overseasInvestors).where(eq(overseasInvestors.email, email));
    return investor || undefined;
  }

  async createOverseasInvestor(insertInvestor: InsertOverseasInvestor): Promise<OverseasInvestor> {
    const [investor] = await db
      .insert(overseasInvestors)
      .values(insertInvestor)
      .returning();
    return investor;
  }

  async updateOverseasInvestor(id: number, updateData: Partial<InsertOverseasInvestor>): Promise<OverseasInvestor | undefined> {
    const [investor] = await db
      .update(overseasInvestors)
      .set(updateData)
      .where(eq(overseasInvestors.id, id))
      .returning();
    return investor || undefined;
  }

  async deleteOverseasInvestor(id: number): Promise<boolean> {
    const result = await db.delete(overseasInvestors).where(eq(overseasInvestors.id, id));
    return result.rowCount! > 0;
  }

  // Companies
  async getCompanies(organizationId: number): Promise<Company[]> {
    return await db.select().from(companies).where(
      sql`${companies.status} = 'active' AND ${companies.organizationId} = ${organizationId}`
    );
  }

  async getCompany(id: number, organizationId: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(
      sql`${companies.id} = ${id} AND ${companies.organizationId} = ${organizationId}`
    );
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany, organizationId: number): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values({ ...insertCompany, organizationId })
      .returning();
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>, organizationId: number): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(sql`${companies.id} = ${id} AND ${companies.organizationId} = ${organizationId}`)
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(companies).where(
      sql`${companies.id} = ${id} AND ${companies.organizationId} = ${organizationId}`
    );
    return result.rowCount! > 0;
  }

  // Overseas Companies
  async getOverseasCompanies(organizationId: number): Promise<OverseasCompany[]> {
    return await db.select().from(overseasCompanies).where(eq(overseasCompanies.organizationId, organizationId));
  }

  async getOverseasCompany(id: number): Promise<OverseasCompany | undefined> {
    const [company] = await db.select().from(overseasCompanies).where(eq(overseasCompanies.id, id));
    return company || undefined;
  }

  async createOverseasCompany(insertCompany: InsertOverseasCompany): Promise<OverseasCompany> {
    const [company] = await db
      .insert(overseasCompanies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async updateOverseasCompany(id: number, updateData: Partial<InsertOverseasCompany>): Promise<OverseasCompany | undefined> {
    const [company] = await db
      .update(overseasCompanies)
      .set(updateData)
      .where(eq(overseasCompanies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteOverseasCompany(id: number): Promise<boolean> {
    const result = await db.delete(overseasCompanies).where(eq(overseasCompanies.id, id));
    return result.rowCount! > 0;
  }

  // Investments
  async getInvestments(): Promise<Investment[]> {
    return await db.select().from(investments);
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    const [investment] = await db.select().from(investments).where(eq(investments.id, id));
    return investment || undefined;
  }

  async getInvestmentsByInvestor(investorId: number): Promise<Investment[]> {
    return await db.select().from(investments).where(eq(investments.investorId, investorId));
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const [investment] = await db
      .insert(investments)
      .values(insertInvestment)
      .returning();
    return investment;
  }

  async updateInvestment(id: number, updateData: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const [investment] = await db
      .update(investments)
      .set(updateData)
      .where(eq(investments.id, id))
      .returning();
    return investment || undefined;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    const result = await db.delete(investments).where(eq(investments.id, id));
    return result.rowCount! > 0;
  }

  // Communications
  async getCommunications(): Promise<Communication[]> {
    return await db.select().from(communications);
  }

  async getCommunication(id: number): Promise<Communication | undefined> {
    const [communication] = await db.select().from(communications).where(eq(communications.id, id));
    return communication || undefined;
  }

  async getCommunicationsByInvestor(investorId: number): Promise<Communication[]> {
    return await db.select().from(communications).where(eq(communications.investorId, investorId));
  }

  async createCommunication(insertCommunication: InsertCommunication): Promise<Communication> {
    const [communication] = await db
      .insert(communications)
      .values(insertCommunication)
      .returning();
    return communication;
  }

  async updateCommunication(id: number, updateData: Partial<InsertCommunication>): Promise<Communication | undefined> {
    const [communication] = await db
      .update(communications)
      .set(updateData)
      .where(eq(communications.id, id))
      .returning();
    return communication || undefined;
  }

  async deleteCommunication(id: number): Promise<boolean> {
    const result = await db.delete(communications).where(eq(communications.id, id));
    return result.rowCount! > 0;
  }

  // Meetings
  async getMeetings(organizationId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.organizationId, organizationId));
  }

  async getMeeting(id: number, organizationId: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(
      sql`${meetings.id} = ${id} AND ${meetings.organizationId} = ${organizationId}`
    );
    return meeting || undefined;
  }

  async getMeetingsByInvestor(investorId: number, organizationId: number): Promise<Meeting[]> {
    // Since we now use investorIds array, need to check if the investorId is in the array
    return await db.select().from(meetings).where(
      sql`${investorId}::text = ANY(investor_ids) AND ${meetings.organizationId} = ${organizationId}`
    );
  }

  async getMeetingsByAnalyst(analystId: number): Promise<Meeting[]> {
    // Check meetings where analystId is in the analystIds array or matches the legacy analystId field
    return await db.select().from(meetings).where(
      sql`${analystId}::text = ANY(analyst_ids) OR analyst_id = ${analystId}`
    );
  }

  async getUpcomingMeetings(organizationId: number): Promise<Meeting[]> {
    const now = new Date();
    const allMeetings = await db.select().from(meetings).where(eq(meetings.organizationId, organizationId));
    
    // For development/testing, consider meetings in the near past as "upcoming" if they're within the last day
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return allMeetings
      .filter(meeting => meeting.scheduledDate && new Date(meeting.scheduledDate) > oneDayAgo)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }

  async createMeeting(insertMeeting: InsertMeeting, organizationId: number): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values({ ...insertMeeting, organizationId })
      .returning();
    return meeting;
  }

  async updateMeeting(id: number, updateData: Partial<InsertMeeting>, organizationId: number): Promise<Meeting | undefined> {
    const [meeting] = await db
      .update(meetings)
      .set(updateData)
      .where(sql`${meetings.id} = ${id} AND ${meetings.organizationId} = ${organizationId}`)
      .returning();
    return meeting || undefined;
  }

  async deleteMeeting(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(meetings).where(
      sql`${meetings.id} = ${id} AND ${meetings.organizationId} = ${organizationId}`
    );
    return result.rowCount! > 0;
  }

  async updateMeetingMinutes(id: number, minutesData: {
    minutesFilePath: string;
    minutesFileName: string;
    minutesFileSize: number;
    minutesUploadedAt: Date;
  }): Promise<Meeting | undefined> {
    const [meeting] = await db
      .update(meetings)
      .set(minutesData)
      .where(eq(meetings.id, id))
      .returning();
    return meeting || undefined;
  }



  // Funds
  async getFunds(): Promise<Fund[]> {
    return await db.select().from(funds);
  }

  async getFund(id: number): Promise<Fund | undefined> {
    const [fund] = await db.select().from(funds).where(eq(funds.id, id));
    return fund || undefined;
  }

  async getFundsByCompany(companyId: number): Promise<Fund[]> {
    return await db.select().from(funds).where(eq(funds.companyId, companyId));
  }

  async createFund(insertFund: InsertFund): Promise<Fund> {
    const [fund] = await db
      .insert(funds)
      .values(insertFund)
      .returning();
    return fund;
  }

  async updateFund(id: number, updateData: Partial<InsertFund>): Promise<Fund | undefined> {
    const [fund] = await db
      .update(funds)
      .set(updateData)
      .where(eq(funds.id, id))
      .returning();
    return fund || undefined;
  }

  async deleteFund(id: number): Promise<boolean> {
    const result = await db.delete(funds).where(eq(funds.id, id));
    return result.rowCount! > 0;
  }

  // Overseas Funds
  async getOverseasFunds(organizationId: number): Promise<OverseasFund[]> {
    return await db.select().from(overseasFunds).where(eq(overseasFunds.organizationId, organizationId));
  }

  async getOverseasFund(id: number, organizationId: number): Promise<OverseasFund | undefined> {
    const [fund] = await db.select().from(overseasFunds).where(eq(overseasFunds.id, id)).where(eq(overseasFunds.organizationId, organizationId));
    return fund || undefined;
  }

  async createOverseasFund(insertFund: InsertOverseasFund, organizationId: number): Promise<OverseasFund> {
    const [fund] = await db
      .insert(overseasFunds)
      .values({ ...insertFund, organizationId })
      .returning();
    return fund;
  }

  async updateOverseasFund(id: number, updateData: Partial<InsertOverseasFund>, organizationId: number): Promise<OverseasFund | undefined> {
    const [fund] = await db
      .update(overseasFunds)
      .set(updateData)
      .where(eq(overseasFunds.id, id))
      .where(eq(overseasFunds.organizationId, organizationId))
      .returning();
    return fund || undefined;
  }

  async deleteOverseasFund(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(overseasFunds).where(eq(overseasFunds.id, id)).where(eq(overseasFunds.organizationId, organizationId));
    return result.rowCount! > 0;
  }

  // Meeting Logs
  async getMeetingLogs(): Promise<MeetingLog[]> {
    return await db.select().from(meetingLogs);
  }

  async getMeetingLog(id: number): Promise<MeetingLog | undefined> {
    const [meetingLog] = await db.select().from(meetingLogs).where(eq(meetingLogs.id, id));
    return meetingLog || undefined;
  }

  async getMeetingLogsByInvestor(investorId: number): Promise<MeetingLog[]> {
    return await db.select().from(meetingLogs).where(eq(meetingLogs.investorId, investorId));
  }

  async createMeetingLog(insertMeetingLog: InsertMeetingLog): Promise<MeetingLog> {
    const [meetingLog] = await db
      .insert(meetingLogs)
      .values(insertMeetingLog)
      .returning();
    return meetingLog;
  }

  async updateMeetingLog(id: number, updateData: Partial<InsertMeetingLog>): Promise<MeetingLog | undefined> {
    const [meetingLog] = await db
      .update(meetingLogs)
      .set(updateData)
      .where(eq(meetingLogs.id, id))
      .returning();
    return meetingLog || undefined;
  }

  async deleteMeetingLog(id: number): Promise<boolean> {
    const result = await db.delete(meetingLogs).where(eq(meetingLogs.id, id));
    return result.rowCount! > 0;
  }

  // NDR/Conference methods
  async getNdrConferences(): Promise<NdrConference[]> {
    return await db.select().from(ndrConferences).orderBy(desc(ndrConferences.startDate));
  }

  async getNdrConference(id: number): Promise<NdrConference | undefined> {
    const [conference] = await db.select().from(ndrConferences).where(eq(ndrConferences.id, id));
    return conference || undefined;
  }

  async createNdrConference(insertConference: InsertNdrConference): Promise<NdrConference> {
    const [conference] = await db
      .insert(ndrConferences)
      .values(insertConference)
      .returning();
    return conference;
  }

  async updateNdrConference(id: number, updateData: Partial<InsertNdrConference>): Promise<NdrConference | undefined> {
    const [conference] = await db
      .update(ndrConferences)
      .set(updateData)
      .where(eq(ndrConferences.id, id))
      .returning();
    return conference || undefined;
  }

  async deleteNdrConference(id: number): Promise<boolean> {
    const result = await db.delete(ndrConferences).where(eq(ndrConferences.id, id));
    return result.rowCount! > 0;
  }

  // Other Events CRUD operations
  async getOtherEvents(): Promise<OtherEvent[]> {
    return await db.select().from(otherEvents).orderBy(desc(otherEvents.startDate));
  }

  async getOtherEvent(id: number): Promise<OtherEvent | undefined> {
    const [event] = await db.select().from(otherEvents).where(eq(otherEvents.id, id));
    return event || undefined;
  }

  async createOtherEvent(insertEvent: InsertOtherEvent): Promise<OtherEvent> {
    const [event] = await db
      .insert(otherEvents)
      .values(insertEvent)
      .returning();
    return event;
  }

  async updateOtherEvent(id: number, updateData: Partial<InsertOtherEvent>): Promise<OtherEvent | undefined> {
    const [event] = await db
      .update(otherEvents)
      .set(updateData)
      .where(eq(otherEvents.id, id))
      .returning();
    return event || undefined;
  }

  async deleteOtherEvent(id: number): Promise<boolean> {
    const result = await db.delete(otherEvents).where(eq(otherEvents.id, id));
    return result.rowCount! > 0;
  }

  // Email Template methods
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db.select().from(emailTemplates).where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async getEmailTemplatesByLanguage(language: string): Promise<EmailTemplate[]> {
    return await db.select().from(emailTemplates).where(eq(emailTemplates.language, language));
  }

  async createEmailTemplate(insertTemplate: InsertEmailTemplate): Promise<EmailTemplate> {
    const [template] = await db
      .insert(emailTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async updateEmailTemplate(id: number, updateData: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db.delete(emailTemplates).where(eq(emailTemplates.id, id));
    return result.rowCount! > 0;
  }

  // Email Campaign methods
  async getEmailCampaigns(): Promise<EmailCampaign[]> {
    return await db.select().from(emailCampaigns).orderBy(desc(emailCampaigns.createdAt));
  }

  async getEmailCampaign(id: number): Promise<EmailCampaign | undefined> {
    const [campaign] = await db.select().from(emailCampaigns).where(eq(emailCampaigns.id, id));
    return campaign || undefined;
  }

  async createEmailCampaign(insertCampaign: InsertEmailCampaign): Promise<EmailCampaign> {
    const [campaign] = await db
      .insert(emailCampaigns)
      .values(insertCampaign)
      .returning();
    return campaign;
  }

  async updateEmailCampaign(id: number, updateData: Partial<InsertEmailCampaign>): Promise<EmailCampaign | undefined> {
    const [campaign] = await db
      .update(emailCampaigns)
      .set(updateData)
      .where(eq(emailCampaigns.id, id))
      .returning();
    return campaign || undefined;
  }

  // Analysts
  async getAnalysts(organizationId: number): Promise<Analyst[]> {
    return await db.select().from(analysts).where(eq(analysts.organizationId, organizationId));
  }

  async getAnalyst(id: number, organizationId: number): Promise<Analyst | undefined> {
    const [analyst] = await db.select().from(analysts).where(
      sql`${analysts.id} = ${id} AND ${analysts.organizationId} = ${organizationId}`
    );
    return analyst || undefined;
  }

  async getAnalystByEmail(email: string, organizationId: number): Promise<Analyst | undefined> {
    const [analyst] = await db.select().from(analysts).where(
      sql`${analysts.email} = ${email} AND ${analysts.organizationId} = ${organizationId}`
    );
    return analyst || undefined;
  }

  async createAnalyst(insertAnalyst: InsertAnalyst, organizationId: number): Promise<Analyst> {
    const [analyst] = await db
      .insert(analysts)
      .values({ ...insertAnalyst, organizationId })
      .returning();
    return analyst;
  }

  async updateAnalyst(id: number, updateData: Partial<InsertAnalyst>, organizationId: number): Promise<Analyst | undefined> {
    const [analyst] = await db
      .update(analysts)
      .set(updateData)
      .where(sql`${analysts.id} = ${id} AND ${analysts.organizationId} = ${organizationId}`)
      .returning();
    return analyst || undefined;
  }

  async deleteAnalyst(id: number, organizationId: number): Promise<boolean> {
    const result = await db.delete(analysts).where(
      sql`${analysts.id} = ${id} AND ${analysts.organizationId} = ${organizationId}`
    );
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Documents
  async getDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.createdAt));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async getDocumentsByCategory(category: string): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.category, category)).orderBy(desc(documents.createdAt));
  }



  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db
      .insert(documents)
      .values(insertDocument)
      .returning();
    return document;
  }

  async updateDocument(id: number, updateData: Partial<InsertDocument>): Promise<Document | undefined> {
    const [document] = await db
      .update(documents)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return document || undefined;
  }

  async deleteDocument(id: number): Promise<boolean> {
    const result = await db.delete(documents).where(eq(documents.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Securities Firms
  async getSecuritiesFirms(): Promise<SecuritiesFirm[]> {
    return await db.select().from(securitiesFirms);
  }

  async getSecuritiesFirm(id: number): Promise<SecuritiesFirm | undefined> {
    const [firm] = await db.select().from(securitiesFirms).where(eq(securitiesFirms.id, id));
    return firm || undefined;
  }

  async createSecuritiesFirm(insertFirm: InsertSecuritiesFirm): Promise<SecuritiesFirm> {
    const [firm] = await db
      .insert(securitiesFirms)
      .values(insertFirm)
      .returning();
    return firm;
  }

  async updateSecuritiesFirm(id: number, updateData: Partial<InsertSecuritiesFirm>): Promise<SecuritiesFirm | undefined> {
    const [firm] = await db
      .update(securitiesFirms)
      .set(updateData)
      .where(eq(securitiesFirms.id, id))
      .returning();
    return firm || undefined;
  }

  async deleteSecuritiesFirm(id: number): Promise<boolean> {
    const result = await db.delete(securitiesFirms).where(eq(securitiesFirms.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // Email Logs
  async getEmailLogs(): Promise<EmailLog[]> {
    return await db.select().from(emailLogs).orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLog(id: number): Promise<EmailLog | undefined> {
    const [emailLog] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return emailLog || undefined;
  }

  async createEmailLog(insertEmailLog: InsertEmailLog): Promise<EmailLog> {
    const [emailLog] = await db
      .insert(emailLogs)
      .values(insertEmailLog)
      .returning();
    return emailLog;
  }

  async getEmailLogsByRecipient(email: string): Promise<EmailLog[]> {
    return await db.select().from(emailLogs)
      .where(eq(emailLogs.recipientEmail, email))
      .orderBy(desc(emailLogs.sentAt));
  }

  // Users
  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount! > 0;
  }

}

export const storage = new DatabaseStorage();
