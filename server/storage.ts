import { 
  investors, companies, investments, communications, meetings,
  type Investor, type InsertInvestor,
  type Company, type InsertCompany,
  type Investment, type InsertInvestment,
  type Communication, type InsertCommunication,
  type Meeting, type InsertMeeting
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Investors
  getInvestors(): Promise<Investor[]>;
  getInvestor(id: number): Promise<Investor | undefined>;
  getInvestorByEmail(email: string): Promise<Investor | undefined>;
  createInvestor(investor: InsertInvestor): Promise<Investor>;
  updateInvestor(id: number, investor: Partial<InsertInvestor>): Promise<Investor | undefined>;
  deleteInvestor(id: number): Promise<boolean>;

  // Companies
  getCompanies(): Promise<Company[]>;
  getCompany(id: number): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: number, company: Partial<InsertCompany>): Promise<Company | undefined>;
  deleteCompany(id: number): Promise<boolean>;

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
  getMeetings(): Promise<Meeting[]>;
  getMeeting(id: number): Promise<Meeting | undefined>;
  getMeetingsByInvestor(investorId: number): Promise<Meeting[]>;
  getUpcomingMeetings(): Promise<Meeting[]>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, meeting: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  deleteMeeting(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // Investors
  async getInvestors(): Promise<Investor[]> {
    return await db.select().from(investors);
  }

  async getInvestor(id: number): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.id, id));
    return investor || undefined;
  }

  async getInvestorByEmail(email: string): Promise<Investor | undefined> {
    const [investor] = await db.select().from(investors).where(eq(investors.email, email));
    return investor || undefined;
  }

  async createInvestor(insertInvestor: InsertInvestor): Promise<Investor> {
    const [investor] = await db
      .insert(investors)
      .values(insertInvestor)
      .returning();
    return investor;
  }

  async updateInvestor(id: number, updateData: Partial<InsertInvestor>): Promise<Investor | undefined> {
    const [investor] = await db
      .update(investors)
      .set(updateData)
      .where(eq(investors.id, id))
      .returning();
    return investor || undefined;
  }

  async deleteInvestor(id: number): Promise<boolean> {
    const result = await db.delete(investors).where(eq(investors.id, id));
    return result.rowCount! > 0;
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return await db.select().from(companies).where(eq(companies.status, 'active'));
  }

  async getCompany(id: number): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company || undefined;
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const [company] = await db
      .insert(companies)
      .values(insertCompany)
      .returning();
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const [company] = await db
      .update(companies)
      .set(updateData)
      .where(eq(companies.id, id))
      .returning();
    return company || undefined;
  }

  async deleteCompany(id: number): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
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
  async getMeetings(): Promise<Meeting[]> {
    return await db.select().from(meetings);
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    const [meeting] = await db.select().from(meetings).where(eq(meetings.id, id));
    return meeting || undefined;
  }

  async getMeetingsByInvestor(investorId: number): Promise<Meeting[]> {
    return await db.select().from(meetings).where(eq(meetings.investorId, investorId));
  }

  async getUpcomingMeetings(): Promise<Meeting[]> {
    const now = new Date();
    const allMeetings = await db.select().from(meetings);
    return allMeetings
      .filter(meeting => meeting.scheduledDate && new Date(meeting.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const [meeting] = await db
      .insert(meetings)
      .values(insertMeeting)
      .returning();
    return meeting;
  }

  async updateMeeting(id: number, updateData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [meeting] = await db
      .update(meetings)
      .set(updateData)
      .where(eq(meetings.id, id))
      .returning();
    return meeting || undefined;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    const result = await db.delete(meetings).where(eq(meetings.id, id));
    return result.rowCount! > 0;
  }
}

export const storage = new DatabaseStorage();
