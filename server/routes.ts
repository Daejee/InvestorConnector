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
  insertMeetingSchema,
  insertFundSchema,
  insertMeetingLogSchema,
  insertNdrConferenceSchema
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

  app.patch("/api/investors/:id", async (req, res) => {
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
      let detectedHeaders: string[] = [];
      
      await new Promise((resolve, reject) => {
        const stream = Readable.from(req.file!.buffer.toString());
        stream
          .pipe(csvParser({
            // Map CSV headers to our schema fields (case-insensitive)
            mapHeaders: ({ header }) => {
              detectedHeaders.push(header);
              
              const normalized = header.toLowerCase().trim();
              switch (normalized) {
                case 'name':
                case 'company name':
                case 'company':
                  return 'name';
                case 'hq location':
                case 'hq':
                case 'location':
                case 'headquarters':
                case 'hq_location':
                  return 'hqLocation';
                case 'aum':
                case 'assets under management':
                case 'total aum':
                case 'aum (bil)':
                case 'aum (billion usd)':
                case 'aum_bil':
                  return 'aum';
                case 'type':
                case 'company type':
                case 'fund type':
                case 'investment_type':
                  return 'type';
                case 'area':
                case 'region':
                case 'geography':
                case 'investment_area':
                  return 'area';
                default:
                  return header;
              }
            }
          }))
          .on('data', (data) => {
            lineNumber++;
            
            // Log first data row for debugging
            if (lineNumber === 2) {
              console.log('First data row:', data);
              console.log('Mapped data keys:', Object.keys(data));
            }
            
            try {
              // Check which required fields are missing (case-insensitive)
              const missingFields = [];
              
              // Check for name field (various possible keys)
              const nameValue = data.name || data.Name || data['Company Name'] || data['company name'];
              if (!nameValue || nameValue.toString().trim() === '') missingFields.push('name');
              
              // Check for hqLocation field (various possible keys)
              const hqLocationValue = data.hqLocation || data.Hqlocation || data['HQ Location'] || data['hq location'] || data.location || data.Location;
              if (!hqLocationValue || hqLocationValue.toString().trim() === '') missingFields.push('hqLocation');
              
              // Check for aum field (various possible keys)
              const aumFieldValue = data.aum || data.AUM || data['AUM (Billion USD)'] || data['aum (billion usd)'];
              if (!aumFieldValue || aumFieldValue.toString().trim() === '') missingFields.push('aum');
              
              // Check for type field (various possible keys)
              const typeValue = data.type || data.Type;
              if (!typeValue || typeValue.toString().trim() === '') missingFields.push('type');
              
              // Check for area field (various possible keys)
              const areaValue = data.area || data.Area || data.region || data.Region;
              if (!areaValue || areaValue.toString().trim() === '') missingFields.push('area');

              if (missingFields.length > 0) {
                console.log(`Line ${lineNumber} data:`, data);
                errors.push(`Line ${lineNumber}: Missing required fields: ${missingFields.join(', ')}`);
                return;
              }

              // Use the flexible field values we found
              const finalName = nameValue.toString().trim();
              const finalHqLocation = hqLocationValue.toString().trim();
              const finalType = typeValue.toString().trim();
              const finalArea = areaValue.toString().trim();
              const finalAum = aumFieldValue.toString().trim();

              // Validate company type (allow any non-empty string)
              if (!finalType) {
                errors.push(`Line ${lineNumber}: Company type cannot be empty`);
                return;
              }

              // Validate area (allow any non-empty string)
              if (!finalArea) {
                errors.push(`Line ${lineNumber}: Area cannot be empty`);
                return;
              }

              // Validate AUM is a number (in billions)
              const aumNumericValue = parseFloat(finalAum);
              if (isNaN(aumNumericValue) || aumNumericValue < 0) {
                errors.push(`Line ${lineNumber}: AUM must be a valid positive number in billions, got "${finalAum}"`);
                return;
              }

              // Convert billions to full amount for storage
              const aumInFullAmount = (aumNumericValue * 1000000000).toString();

              const companyData = {
                name: finalName,
                hqLocation: finalHqLocation,
                aum: aumInFullAmount,
                type: finalType,
                area: finalArea
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

      // If there are validation errors, return them with helpful information
      if (errors.length > 0) {
        console.log('CSV validation errors:', errors);
        return res.status(400).json({
          message: "CSV validation failed",
          errors,
          processedRows: lineNumber - 1,
          detectedHeaders: detectedHeaders,
          expectedFormat: {
            requiredColumns: ["Name", "HQ Location", "AUM (in bil)", "Type", "Area"],
            acceptedVariations: {
              name: ["name", "company name", "company"],
              hqLocation: ["hq location", "hq", "location", "headquarters", "hq_location"],
              aum: ["aum", "assets under management", "total aum", "aum (bil)", "aum_bil"],
              type: ["type", "company type", "fund type", "investment_type"],
              area: ["area", "region", "geography", "investment_area"]
            }
          }
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

  // Funds routes
  app.get("/api/funds", async (req, res) => {
    const funds = await storage.getFunds();
    res.json(funds);
  });

  app.get("/api/funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const fund = await storage.getFund(id);
    if (!fund) {
      return res.status(404).json({ message: "Fund not found" });
    }
    res.json(fund);
  });

  app.get("/api/funds/company/:companyId", async (req, res) => {
    const companyId = parseInt(req.params.companyId);
    const funds = await storage.getFundsByCompany(companyId);
    res.json(funds);
  });

  app.post("/api/funds", async (req, res) => {
    try {
      const data = insertFundSchema.parse(req.body);
      const fund = await storage.createFund(data);
      res.status(201).json(fund);
    } catch (error) {
      res.status(400).json({ message: "Invalid fund data", error });
    }
  });

  app.put("/api/funds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertFundSchema.parse(req.body);
      const fund = await storage.updateFund(id, data);
      if (!fund) {
        return res.status(404).json({ message: "Fund not found" });
      }
      res.json(fund);
    } catch (error) {
      res.status(400).json({ message: "Invalid fund data", error });
    }
  });

  app.delete("/api/funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteFund(id);
    if (!success) {
      return res.status(404).json({ message: "Fund not found" });
    }
    res.status(204).send();
  });

  // Funds CSV upload
  app.post("/api/funds/upload-csv", upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const csvData: any[] = [];
      const errors: string[] = [];
      const results: any[] = [];
      let lineNumber = 1;

      // Parse CSV from buffer
      const stream = Readable.from(req.file.buffer.toString());
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csvParser())
          .on('data', (data) => {
            csvData.push(data);
          })
          .on('end', () => {
            resolve(csvData);
          })
          .on('error', reject);
      });

      console.log('First data row:', csvData[0]);
      console.log('Mapped data keys:', Object.keys(csvData[0] || {}));

      // Process each row
      for (const data of csvData) {
        lineNumber++;
        
        try {
          // Check which required fields are missing (case-insensitive)
          const missingFields = [];
          
          // Check for name field (various possible keys)
          const nameValue = data.name || data.Name || data['Fund Name'] || data['fund name'];
          if (!nameValue || nameValue.toString().trim() === '') missingFields.push('name');
          
          // Check for company field (various possible keys)
          const companyValue = data.company || data.Company || data['Company Name'] || data['company name'];
          if (!companyValue || companyValue.toString().trim() === '') missingFields.push('company');
          
          // Check for aum field (various possible keys)
          const aumFieldValue = data.aum || data.AUM || data['AUM (Billion USD)'] || data['aum (billion usd)'];
          if (!aumFieldValue || aumFieldValue.toString().trim() === '') missingFields.push('aum');
          
          // Check for type field (various possible keys)
          const typeValue = data.type || data.Type || data['Fund Type'] || data['fund type'];
          if (!typeValue || typeValue.toString().trim() === '') missingFields.push('type');
          
          // Check for ownOurShares field (various possible keys) - make this optional
          const ownSharesValue = data.ownOurShares || data['Own Our Shares'] || data['own our shares'] || data.ownShares;

          if (missingFields.length > 0) {
            console.log(`Line ${lineNumber} data:`, data);
            errors.push(`Line ${lineNumber}: Missing required fields: ${missingFields.join(', ')}`);
            continue;
          }

          // Use the flexible field values we found
          const finalName = nameValue.toString().trim();
          const finalCompanyName = companyValue.toString().trim();
          const finalType = typeValue.toString().trim();
          const finalAum = aumFieldValue.toString().trim();
          // Default to false if ownOurShares is not provided
          const finalOwnShares = ownSharesValue ? (ownSharesValue.toString().toLowerCase() === 'yes' || ownSharesValue.toString().toLowerCase() === 'true') : false;
          const finalShareAmount = (data.shareAmount || data['Share Amount'] || data['share amount'] || "").toString().trim();

          // Find company by name
          const companies = await storage.getCompanies();
          const company = companies.find(c => c.name.toLowerCase() === finalCompanyName.toLowerCase());
          if (!company) {
            errors.push(`Line ${lineNumber}: Company "${finalCompanyName}" not found`);
            continue;
          }

          // Validate fund type
          const validTypes = ['Value', 'Growth', 'GARP', 'Index', 'Other'];
          if (!validTypes.includes(finalType)) {
            errors.push(`Line ${lineNumber}: Invalid fund type "${finalType}". Must be one of: ${validTypes.join(', ')}`);
            continue;
          }

          // Validate AUM is a number (in billions)
          const aumNumericValue = parseFloat(finalAum);
          if (isNaN(aumNumericValue) || aumNumericValue < 0) {
            errors.push(`Line ${lineNumber}: AUM must be a valid positive number in billions, got "${finalAum}"`);
            continue;
          }

          const fundData = {
            name: finalName,
            companyId: company.id,
            aum: finalAum,
            type: finalType,
            ownOurShares: finalOwnShares,
            shareAmount: finalOwnShares && finalShareAmount ? finalShareAmount : ""
          };

          // Validate with Zod schema
          const validatedData = insertFundSchema.parse(fundData);
          results.push(validatedData);

        } catch (error) {
          console.error(`Error processing line ${lineNumber}:`, error);
          errors.push(`Line ${lineNumber}: ${error instanceof Error ? error.message : 'Invalid data format'}`);
        }
      }

      if (errors.length > 0) {
        console.log('CSV validation errors:', errors);
        return res.status(400).json({ 
          message: "CSV validation failed", 
          errors: errors.slice(0, 10) // Limit to first 10 errors
        });
      }

      // If validation passed, create all funds
      const createdFunds = [];
      for (const fundData of results) {
        const fund = await storage.createFund(fundData);
        createdFunds.push(fund);
      }

      res.status(201).json({ 
        message: `Successfully imported ${createdFunds.length} funds`,
        funds: createdFunds 
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ 
        message: "Failed to process CSV file", 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  });

  // Meeting Logs routes
  app.get("/api/meeting-logs", async (req, res) => {
    const meetingLogs = await storage.getMeetingLogs();
    res.json(meetingLogs);
  });

  app.get("/api/meeting-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const meetingLog = await storage.getMeetingLog(id);
    if (meetingLog) {
      res.json(meetingLog);
    } else {
      res.status(404).json({ message: "Meeting log not found" });
    }
  });

  app.get("/api/meeting-logs/investor/:investorId", async (req, res) => {
    const investorId = parseInt(req.params.investorId);
    const meetingLogs = await storage.getMeetingLogsByInvestor(investorId);
    res.json(meetingLogs);
  });

  app.post("/api/meeting-logs", async (req, res) => {
    try {
      // Transform date string to Date object before validation
      const requestData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined
      };
      const data = insertMeetingLogSchema.parse(requestData);
      const meetingLog = await storage.createMeetingLog(data);
      res.status(201).json(meetingLog);
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });

  app.patch("/api/meeting-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Transform date string to Date object before validation
      const requestData = {
        ...req.body,
        date: req.body.date ? new Date(req.body.date) : undefined
      };
      const data = insertMeetingLogSchema.partial().parse(requestData);
      const meetingLog = await storage.updateMeetingLog(id, data);
      if (meetingLog) {
        res.json(meetingLog);
      } else {
        res.status(404).json({ message: "Meeting not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });

  app.delete("/api/meeting-logs/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteMeetingLog(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Meeting log not found" });
    }
  });

  // NDR/Conference routes
  app.get("/api/ndr-conferences", async (req, res) => {
    const conferences = await storage.getNdrConferences();
    res.json(conferences);
  });

  app.get("/api/ndr-conferences/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const conference = await storage.getNdrConference(id);
    if (!conference) {
      return res.status(404).json({ message: "Conference not found" });
    }
    res.json(conference);
  });

  app.post("/api/ndr-conferences", async (req, res) => {
    try {
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      const data = insertNdrConferenceSchema.parse(requestData);
      const conference = await storage.createNdrConference(data);
      res.status(201).json(conference);
    } catch (error) {
      res.status(400).json({ message: "Invalid conference data", error });
    }
  });

  app.patch("/api/ndr-conferences/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      const data = insertNdrConferenceSchema.partial().parse(requestData);
      const conference = await storage.updateNdrConference(id, data);
      if (conference) {
        res.json(conference);
      } else {
        res.status(404).json({ message: "Conference not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid conference data", error });
    }
  });

  app.delete("/api/ndr-conferences/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteNdrConference(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Conference not found" });
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
