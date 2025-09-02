import { db } from './db.js';
import { analysts, analystReports, organizations } from '../shared/schema.js';
import type { Analyst, AnalystReport, Organization, InsertAnalyst, InsertAnalystReport, InsertOrganization } from '../shared/schema.js';
import { eq, and } from 'drizzle-orm';

export interface IStorage {
  // Organizations
  createOrganization(data: InsertOrganization): Promise<Organization>;
  getOrganization(id: number): Promise<Organization | undefined>;
  
  // Analysts
  createAnalyst(data: InsertAnalyst): Promise<Analyst>;
  getAnalysts(organizationId: number): Promise<Analyst[]>;
  getAnalyst(id: number, organizationId: number): Promise<Analyst | undefined>;
  updateAnalyst(id: number, organizationId: number, data: Partial<InsertAnalyst>): Promise<Analyst | undefined>;
  deleteAnalyst(id: number, organizationId: number): Promise<boolean>;
  
  // Analyst Reports
  createAnalystReport(data: InsertAnalystReport): Promise<AnalystReport>;
  getAnalystReports(organizationId: number): Promise<AnalystReport[]>;
  getAnalystReport(id: number, organizationId: number): Promise<AnalystReport | undefined>;
  updateAnalystReport(id: number, organizationId: number, data: Partial<InsertAnalystReport>): Promise<AnalystReport | undefined>;
  deleteAnalystReport(id: number, organizationId: number): Promise<boolean>;
}

export class DrizzleStorage implements IStorage {
  // Organizations
  async createOrganization(data: InsertOrganization): Promise<Organization> {
    const result = await db.insert(organizations).values(data).returning();
    return result[0];
  }

  async getOrganization(id: number): Promise<Organization | undefined> {
    const result = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return result[0];
  }

  // Analysts
  async createAnalyst(data: InsertAnalyst): Promise<Analyst> {
    const result = await db.insert(analysts).values(data).returning();
    return result[0];
  }

  async getAnalysts(organizationId: number): Promise<Analyst[]> {
    return await db.select().from(analysts).where(eq(analysts.organizationId, organizationId));
  }

  async getAnalyst(id: number, organizationId: number): Promise<Analyst | undefined> {
    const result = await db
      .select()
      .from(analysts)
      .where(and(eq(analysts.id, id), eq(analysts.organizationId, organizationId)))
      .limit(1);
    return result[0];
  }

  async updateAnalyst(id: number, organizationId: number, data: Partial<InsertAnalyst>): Promise<Analyst | undefined> {
    const result = await db
      .update(analysts)
      .set(data)
      .where(and(eq(analysts.id, id), eq(analysts.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async deleteAnalyst(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(analysts)
      .where(and(eq(analysts.id, id), eq(analysts.organizationId, organizationId)));
    return result.rowCount > 0;
  }

  // Analyst Reports
  async createAnalystReport(data: InsertAnalystReport): Promise<AnalystReport> {
    const result = await db.insert(analystReports).values(data).returning();
    return result[0];
  }

  async getAnalystReports(organizationId: number): Promise<AnalystReport[]> {
    return await db.select().from(analystReports).where(eq(analystReports.organizationId, organizationId));
  }

  async getAnalystReport(id: number, organizationId: number): Promise<AnalystReport | undefined> {
    const result = await db
      .select()
      .from(analystReports)
      .where(and(eq(analystReports.id, id), eq(analystReports.organizationId, organizationId)))
      .limit(1);
    return result[0];
  }

  async updateAnalystReport(id: number, organizationId: number, data: Partial<InsertAnalystReport>): Promise<AnalystReport | undefined> {
    const result = await db
      .update(analystReports)
      .set(data)
      .where(and(eq(analystReports.id, id), eq(analystReports.organizationId, organizationId)))
      .returning();
    return result[0];
  }

  async deleteAnalystReport(id: number, organizationId: number): Promise<boolean> {
    const result = await db
      .delete(analystReports)
      .where(and(eq(analystReports.id, id), eq(analystReports.organizationId, organizationId)));
    return result.rowCount > 0;
  }
}

export const storage = new DrizzleStorage();