import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { storage } from "./storage";
import { 
  insertInvestorSchema, 
  insertCompanySchema, 
  insertInvestmentSchema, 
  insertCommunicationSchema,
  insertMeetingSchema 
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file upload
  const upload = multer({ storage: multer.memoryStorage() });
  // Investors routes
  app.get("/api/investors", async (req, res) => {
    const investors = await storage.getInvestors();
    res.json(investors);
  });

  app.get("/api/investors/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const investor = await storage.getInvestor(id);
    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }
    res.json(investor);
  });

  app.post("/api/investors", async (req, res) => {
    try {
      const data = insertInvestorSchema.parse(req.body);
      const investor = await storage.createInvestor(data);
      res.status(201).json(investor);
    } catch (error) {
      res.status(400).json({ message: "Invalid investor data", error });
    }
  });

  app.put("/api/investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertInvestorSchema.partial().parse(req.body);
      const investor = await storage.updateInvestor(id, data);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      res.json(investor);
    } catch (error) {
      res.status(400).json({ message: "Invalid investor data", error });
    }
  });

  app.delete("/api/investors/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteInvestor(id);
    if (!deleted) {
      return res.status(404).json({ message: "Investor not found" });
    }
    res.status(204).send();
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    const companies = await storage.getCompanies();
    res.json(companies);
  });

  app.post("/api/companies", async (req, res) => {
    try {
      const data = insertCompanySchema.parse(req.body);
      // Convert AUM from billions to full amount for storage
      if (data.aum) {
        const aumInBillions = parseFloat(data.aum);
        data.aum = (aumInBillions * 1000000000).toString();
      }
      const company = await storage.createCompany(data);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data", error });
    }
  });

  app.put("/api/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertCompanySchema.partial().parse(req.body);
      // Convert AUM from billions to full amount for storage
      if (data.aum) {
        const aumInBillions = parseFloat(data.aum);
        data.aum = (aumInBillions * 1000000000).toString();
      }
      const company = await storage.updateCompany(id, data);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid company data", error });
    }
  });

  app.delete("/api/companies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteCompany(id);
    if (!deleted) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(204).send();
  });

  app.put("/api/companies/:id/archive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.updateCompany(id, { status: 'archived' });
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ message: "Company archived successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to archive company", error });
    }
  });

  app.put("/api/companies/:id/restore", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const company = await storage.updateCompany(id, { status: 'active' });
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json({ message: "Company restored successfully" });
    } catch (error) {
      res.status(400).json({ message: "Failed to restore company", error });
    }
  });

  // CSV upload endpoint for companies
  app.post("/api/companies/upload-csv", upload.single("csvFile"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let lineNumber = 1;

      // Parse CSV data
      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file!.buffer.toString());
        stream
          .pipe(csvParser({
            // Map CSV headers to our schema fields (case-insensitive)
            mapHeaders: ({ header }) => {
              const normalized = header.toLowerCase().trim();
              switch (normalized) {
                case 'name':
                case 'company name':
                  return 'name';
                case 'hq location':
                case 'hq':
                case 'location':
                case 'headquarters':
                  return 'hqLocation';
                case 'aum':
                case 'assets under management':
                case 'total aum':
                  return 'aum';
                case 'type':
                case 'company type':
                case 'fund type':
                  return 'type';
                case 'area':
                case 'region':
                case 'geography':
                  return 'area';
                default:
                  return header;
              }
            }
          }))
          .on('data', (data) => {
            lineNumber++;
            try {
              // Validate required fields
              if (!data.name || !data.hqLocation || !data.aum || !data.type || !data.area) {
                errors.push(`Line ${lineNumber}: Missing required fields (name, hqLocation, aum, type, area)`);
                return;
              }

              // Validate company type (allow any non-empty string)
              if (!data.type.trim()) {
                errors.push(`Line ${lineNumber}: Company type cannot be empty`);
                return;
              }

              // Validate area (allow any non-empty string)
              if (!data.area.trim()) {
                errors.push(`Line ${lineNumber}: Area cannot be empty`);
                return;
              }

              // Validate AUM is a number (in billions)
              const aumValue = parseFloat(data.aum);
              if (isNaN(aumValue) || aumValue < 0) {
                errors.push(`Line ${lineNumber}: AUM must be a valid positive number in bil, got "${data.aum}"`);
                return;
              }

              // Convert billions to full amount for storage
              const aumInFullAmount = (aumValue * 1000000000).toString();

              const companyData = {
                name: data.name.trim(),
                hqLocation: data.hqLocation.trim(),
                aum: aumInFullAmount,
                type: data.type.trim(),
                area: data.area.trim()
              };

              // Validate with Zod schema
              const validatedData = insertCompanySchema.parse(companyData);
              results.push(validatedData);
            } catch (error: any) {
              errors.push(`Line ${lineNumber}: ${error.message}`);
            }
          })
          .on('end', resolve)
          .on('error', reject);
      });

      // If there are validation errors, return them
      if (errors.length > 0) {
        console.log('CSV validation errors:', errors);
        return res.status(400).json({
          message: "CSV validation failed",
          errors,
          processedRows: lineNumber - 1
        });
      }

      // Insert valid companies into database, checking for duplicates
      const createdCompanies = [];
      for (const companyData of results) {
        try {
          // Check if company already exists
          const existingCompany = await storage.getCompanies();
          const duplicate = existingCompany.find(c => c.name.toLowerCase() === companyData.name.toLowerCase());
          
          if (duplicate) {
            errors.push(`Company "${companyData.name}" already exists in database`);
            continue;
          }
          
          const company = await storage.createCompany(companyData);
          createdCompanies.push(company);
        } catch (error: any) {
          errors.push(`Failed to create company "${companyData.name}": ${error.message}`);
        }
      }

      res.status(201).json({
        message: `Successfully imported ${createdCompanies.length} companies`,
        importedCount: createdCompanies.length,
        totalRows: results.length,
        errors: errors.length > 0 ? errors : undefined,
        companies: createdCompanies
      });

    } catch (error: any) {
      res.status(500).json({ 
        message: "Failed to process CSV file", 
        error: error.message 
      });
    }
  });

  // Investments routes
  app.get("/api/investments", async (req, res) => {
    const investments = await storage.getInvestments();
    res.json(investments);
  });

  app.get("/api/investments/investor/:investorId", async (req, res) => {
    const investorId = parseInt(req.params.investorId);
    const investments = await storage.getInvestmentsByInvestor(investorId);
    res.json(investments);
  });

  app.post("/api/investments", async (req, res) => {
    try {
      const data = insertInvestmentSchema.parse(req.body);
      const investment = await storage.createInvestment(data);
      res.status(201).json(investment);
    } catch (error) {
      res.status(400).json({ message: "Invalid investment data", error });
    }
  });

  // Communications routes
  app.get("/api/communications", async (req, res) => {
    const communications = await storage.getCommunications();
    res.json(communications);
  });

  app.get("/api/communications/investor/:investorId", async (req, res) => {
    const investorId = parseInt(req.params.investorId);
    const communications = await storage.getCommunicationsByInvestor(investorId);
    res.json(communications);
  });

  app.post("/api/communications", async (req, res) => {
    try {
      const data = insertCommunicationSchema.parse(req.body);
      const communication = await storage.createCommunication(data);
      res.status(201).json(communication);
    } catch (error) {
      res.status(400).json({ message: "Invalid communication data", error });
    }
  });

  // Meetings routes
  app.get("/api/meetings", async (req, res) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  });

  app.get("/api/meetings/upcoming", async (req, res) => {
    const meetings = await storage.getUpcomingMeetings();
    res.json(meetings);
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      const data = insertMeetingSchema.parse(req.body);
      const meeting = await storage.createMeeting(data);
      res.status(201).json(meeting);
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    const investors = await storage.getInvestors();
    const investments = await storage.getInvestments();
    const meetings = await storage.getMeetings();
    const upcomingMeetings = await storage.getUpcomingMeetings();

    const companies = await storage.getCompanies();
    const totalAum = companies.reduce((sum, company) => {
      return sum + (parseFloat(company.aum || "0"));
    }, 0);

    const activeInvestments = investments.filter(inv => inv.status === "active").length;

    res.json({
      totalInvestors: investors.length,
      totalAum: totalAum,
      activeInvestments: activeInvestments,
      meetingsThisWeek: upcomingMeetings.length
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
