import { 
  investors, companies, investments, communications, meetings,
  type Investor, type InsertInvestor,
  type Company, type InsertCompany,
  type Investment, type InsertInvestment,
  type Communication, type InsertCommunication,
  type Meeting, type InsertMeeting
} from "@shared/schema";

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

export class MemStorage implements IStorage {
  private investors: Map<number, Investor>;
  private companies: Map<number, Company>;
  private investments: Map<number, Investment>;
  private communications: Map<number, Communication>;
  private meetings: Map<number, Meeting>;
  private currentInvestorId: number;
  private currentCompanyId: number;
  private currentInvestmentId: number;
  private currentCommunicationId: number;
  private currentMeetingId: number;

  constructor() {
    this.investors = new Map();
    this.companies = new Map();
    this.investments = new Map();
    this.communications = new Map();
    this.meetings = new Map();
    this.currentInvestorId = 1;
    this.currentCompanyId = 1;
    this.currentInvestmentId = 1;
    this.currentCommunicationId = 1;
    this.currentMeetingId = 1;
  }

  // Investors
  async getInvestors(): Promise<Investor[]> {
    return Array.from(this.investors.values());
  }

  async getInvestor(id: number): Promise<Investor | undefined> {
    return this.investors.get(id);
  }

  async getInvestorByEmail(email: string): Promise<Investor | undefined> {
    return Array.from(this.investors.values()).find(investor => investor.email === email);
  }

  async createInvestor(insertInvestor: InsertInvestor): Promise<Investor> {
    const id = this.currentInvestorId++;
    const investor: Investor = { ...insertInvestor, id };
    this.investors.set(id, investor);
    return investor;
  }

  async updateInvestor(id: number, updateData: Partial<InsertInvestor>): Promise<Investor | undefined> {
    const investor = this.investors.get(id);
    if (!investor) return undefined;
    
    const updated = { ...investor, ...updateData };
    this.investors.set(id, updated);
    return updated;
  }

  async deleteInvestor(id: number): Promise<boolean> {
    return this.investors.delete(id);
  }

  // Companies
  async getCompanies(): Promise<Company[]> {
    return Array.from(this.companies.values());
  }

  async getCompany(id: number): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(insertCompany: InsertCompany): Promise<Company> {
    const id = this.currentCompanyId++;
    const company: Company = { ...insertCompany, id };
    this.companies.set(id, company);
    return company;
  }

  async updateCompany(id: number, updateData: Partial<InsertCompany>): Promise<Company | undefined> {
    const company = this.companies.get(id);
    if (!company) return undefined;
    
    const updated = { ...company, ...updateData };
    this.companies.set(id, updated);
    return updated;
  }

  async deleteCompany(id: number): Promise<boolean> {
    return this.companies.delete(id);
  }

  // Investments
  async getInvestments(): Promise<Investment[]> {
    return Array.from(this.investments.values());
  }

  async getInvestment(id: number): Promise<Investment | undefined> {
    return this.investments.get(id);
  }

  async getInvestmentsByInvestor(investorId: number): Promise<Investment[]> {
    return Array.from(this.investments.values()).filter(inv => inv.investorId === investorId);
  }

  async createInvestment(insertInvestment: InsertInvestment): Promise<Investment> {
    const id = this.currentInvestmentId++;
    const investment: Investment = { ...insertInvestment, id };
    this.investments.set(id, investment);
    return investment;
  }

  async updateInvestment(id: number, updateData: Partial<InsertInvestment>): Promise<Investment | undefined> {
    const investment = this.investments.get(id);
    if (!investment) return undefined;
    
    const updated = { ...investment, ...updateData };
    this.investments.set(id, updated);
    return updated;
  }

  async deleteInvestment(id: number): Promise<boolean> {
    return this.investments.delete(id);
  }

  // Communications
  async getCommunications(): Promise<Communication[]> {
    return Array.from(this.communications.values());
  }

  async getCommunication(id: number): Promise<Communication | undefined> {
    return this.communications.get(id);
  }

  async getCommunicationsByInvestor(investorId: number): Promise<Communication[]> {
    return Array.from(this.communications.values()).filter(comm => comm.investorId === investorId);
  }

  async createCommunication(insertCommunication: InsertCommunication): Promise<Communication> {
    const id = this.currentCommunicationId++;
    const communication: Communication = { ...insertCommunication, id };
    this.communications.set(id, communication);
    return communication;
  }

  async updateCommunication(id: number, updateData: Partial<InsertCommunication>): Promise<Communication | undefined> {
    const communication = this.communications.get(id);
    if (!communication) return undefined;
    
    const updated = { ...communication, ...updateData };
    this.communications.set(id, updated);
    return updated;
  }

  async deleteCommunication(id: number): Promise<boolean> {
    return this.communications.delete(id);
  }

  // Meetings
  async getMeetings(): Promise<Meeting[]> {
    return Array.from(this.meetings.values());
  }

  async getMeeting(id: number): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async getMeetingsByInvestor(investorId: number): Promise<Meeting[]> {
    return Array.from(this.meetings.values()).filter(meeting => meeting.investorId === investorId);
  }

  async getUpcomingMeetings(): Promise<Meeting[]> {
    const now = new Date();
    return Array.from(this.meetings.values())
      .filter(meeting => meeting.scheduledDate && new Date(meeting.scheduledDate) > now)
      .sort((a, b) => new Date(a.scheduledDate!).getTime() - new Date(b.scheduledDate!).getTime());
  }

  async createMeeting(insertMeeting: InsertMeeting): Promise<Meeting> {
    const id = this.currentMeetingId++;
    const meeting: Meeting = { ...insertMeeting, id };
    this.meetings.set(id, meeting);
    return meeting;
  }

  async updateMeeting(id: number, updateData: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const meeting = this.meetings.get(id);
    if (!meeting) return undefined;
    
    const updated = { ...meeting, ...updateData };
    this.meetings.set(id, updated);
    return updated;
  }

  async deleteMeeting(id: number): Promise<boolean> {
    return this.meetings.delete(id);
  }
}

export const storage = new MemStorage();
