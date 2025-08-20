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
  insertNdrConferenceSchema,
  insertEmailTemplateSchema,
  insertEmailCampaignSchema,
  insertAnalystSchema,
  insertDocumentSchema,
  insertSecuritiesFirmSchema
} from "@shared/schema";
import { EmailService } from "./email-service";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";

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
      // Store AUM value directly as entered (in billions)
      // No conversion needed since UI displays in billions and database stores the actual value
      if (data.aum) {
        const aumValue = parseFloat(data.aum);
        data.aum = aumValue.toString();
        // Auto-calculate AUM in KRW (trillion won) with 1.4x multiplier
        data.aumKrw = (aumValue * 1.4).toString();
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
      console.log('Update company request:', req.body);
      
      const data = insertCompanySchema.partial().parse(req.body);
      console.log('Parsed data:', data);
      
      // Store AUM value directly as entered (in billions)
      // No conversion needed since UI displays in billions and database stores the actual value
      if (data.aum) {
        const aumValue = parseFloat(data.aum);
        data.aum = aumValue.toString();
        // Auto-calculate AUM in KRW (trillion won) with 1.4x multiplier
        data.aumKrw = (aumValue * 1.4).toString();
      }
      
      console.log('Final data for update:', data);
      const company = await storage.updateCompany(id, data);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error('Company update error:', error);
      res.status(400).json({ message: "Invalid company data", error: error instanceof Error ? error.message : String(error) });
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
                case '회사명':
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
                case 'aum ($bil)':
                case 'aum (billion usd)':
                case 'aum_bil':
                  return 'aum';
                case 'type':
                case 'company type':
                case 'fund type':
                case 'investment_type':
                case '유형':
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
              
              // Check for name field (mapped from header)
              const nameValue = data.name;
              if (!nameValue || nameValue.toString().trim() === '') missingFields.push('name');
              
              // Check for hqLocation field (mapped from header)
              const hqLocationValue = data.hqLocation;
              if (!hqLocationValue || hqLocationValue.toString().trim() === '') missingFields.push('hqLocation');
              
              // Check for aum field (mapped from header)
              const aumFieldValue = data.aum;
              if (!aumFieldValue || aumFieldValue.toString().trim() === '') missingFields.push('aum');
              
              // Check for type field (mapped from header)
              const typeValue = data.type;
              if (!typeValue || typeValue.toString().trim() === '') missingFields.push('type');
              
              // Check for area field (mapped from header)
              const areaValue = data.area;
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

              // Parse AUM value - handle various formats like ">$66B", "~$130B", "$30B+", "66"
              const parseAumValue = (aumString: string): number => {
                // Remove common prefixes and suffixes
                let cleanedAum = aumString
                  .replace(/[>~$+]/g, '') // Remove >, ~, $, + symbols
                  .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content like "(incl. non-hedge assets)"
                  .replace(/[Bb]/g, '') // Remove B for billions
                  .trim();
                
                const numericValue = parseFloat(cleanedAum);
                return numericValue;
              };
              
              const aumNumericValue = parseAumValue(finalAum);
              if (isNaN(aumNumericValue) || aumNumericValue < 0) {
                errors.push(`Line ${lineNumber}: AUM must be a valid positive number in billions, got "${finalAum}"`);
                return;
              }

              // Store AUM value directly (already in billions from CSV)
              const aumInFullAmount = aumNumericValue.toString();

              const companyData = {
                name: finalName,
                hqLocation: finalHqLocation,
                aum: aumInFullAmount,
                aumKrw: (aumNumericValue * 1.4).toString(), // Auto-calculate KRW with 1.4x multiplier
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
      console.log('Received communication data:', req.body);
      
      // Convert date string to Date object if needed
      const processedData = {
        ...req.body,
        date: typeof req.body.date === 'string' ? new Date(req.body.date) : req.body.date
      };
      
      const data = insertCommunicationSchema.parse(processedData);
      console.log('Parsed communication data:', data);
      const communication = await storage.createCommunication(data);
      res.status(201).json(communication);
    } catch (error) {
      console.error('Communication validation error:', error);
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

  // Meeting minutes upload
  app.post("/api/meetings/:meetingId/minutes", async (req, res) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const { uploadURL, fileName, fileSize } = req.body;

      if (!uploadURL || !fileName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      // Update meeting with minutes information
      await storage.updateMeetingMinutes(meetingId, {
        minutesFilePath: objectPath,
        minutesFileName: fileName,
        minutesFileSize: fileSize,
        minutesUploadedAt: new Date()
      });

      res.json({ success: true, objectPath });
    } catch (error) {
      console.error("Failed to save meeting minutes:", error);
      res.status(500).json({ error: "Failed to save meeting minutes" });
    }
  });

  // Get meeting minutes
  app.get("/api/meetings/:meetingId/minutes", async (req, res) => {
    try {
      const meetingId = parseInt(req.params.meetingId);
      const meeting = await storage.getMeeting(meetingId);
      
      if (!meeting || !meeting.minutesFilePath) {
        return res.status(404).json({ error: "Meeting minutes not found" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(meeting.minutesFilePath);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Failed to get meeting minutes:", error);
      res.status(500).json({ error: "Failed to get meeting minutes" });
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

          // Parse AUM value - handle various formats like ">$66B", "~$130B", "$30B+", "66"
          const parseAumValue = (aumString: string): number => {
            // Remove common prefixes and suffixes
            let cleanedAum = aumString
              .replace(/[>~$+]/g, '') // Remove >, ~, $, + symbols
              .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content like "(incl. non-hedge assets)"
              .replace(/[Bb]/g, '') // Remove B for billions
              .trim();
            
            const numericValue = parseFloat(cleanedAum);
            return numericValue;
          };
          
          const aumNumericValue = parseAumValue(finalAum);
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

  // Meetings routes (for scheduling)
  app.get("/api/meetings", async (req, res) => {
    const meetings = await storage.getMeetings();
    res.json(meetings);
  });

  app.get("/api/meetings/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const meeting = await storage.getMeeting(id);
    if (meeting) {
      res.json(meeting);
    } else {
      res.status(404).json({ message: "Meeting not found" });
    }
  });

  app.get("/api/meetings/investor/:investorId", async (req, res) => {
    const investorId = parseInt(req.params.investorId);
    const meetings = await storage.getMeetingsByInvestor(investorId);
    res.json(meetings);
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      console.log('Raw request body:', req.body);
      const data = insertMeetingSchema.parse(req.body);
      console.log('Validated data:', data);
      const meeting = await storage.createMeeting(data);
      res.status(201).json(meeting);
    } catch (error) {
      console.error('Meeting creation error:', error);
      res.status(400).json({ message: "Invalid meeting data", error: error instanceof Error ? error.message : error });
    }
  });

  app.patch("/api/meetings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // Transform scheduledDate string to Date object before validation
      const requestData = {
        ...req.body,
        scheduledDate: req.body.scheduledDate ? new Date(req.body.scheduledDate) : undefined
      };
      const data = insertMeetingSchema.partial().parse(requestData);
      const meeting = await storage.updateMeeting(id, data);
      if (meeting) {
        res.json(meeting);
      } else {
        res.status(404).json({ message: "Meeting not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });

  app.delete("/api/meetings/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteMeeting(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Meeting not found" });
    }
  });

  // Meeting minutes upload endpoint
  app.post("/api/meetings/:id/minutes", async (req, res) => {
    try {
      console.log("Meeting minutes upload request:", req.params.id, req.body);
      
      const meetingId = parseInt(req.params.id);
      const { uploadURL, fileName, fileSize } = req.body;

      if (!uploadURL || !fileName) {
        console.error("Missing required fields:", { uploadURL, fileName });
        return res.status(400).json({ 
          success: false, 
          message: "Missing upload URL or file name" 
        });
      }

      // Extract object path from the upload URL
      let objectPath;
      try {
        const objectStorageService = new ObjectStorageService();
        objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);
        console.log("Normalized object path:", objectPath);
      } catch (pathError) {
        console.error("Path normalization error:", pathError);
        // If normalization fails, use the uploadURL as-is for now
        objectPath = uploadURL;
      }

      // Update the meeting with minutes information
      const minutesData = {
        minutesFilePath: objectPath,
        minutesFileName: fileName,
        minutesFileSize: fileSize || 0,
        minutesUploadedAt: new Date(),
      };

      console.log("Updating meeting with data:", minutesData);
      const updatedMeeting = await storage.updateMeeting(meetingId, minutesData);
      console.log("Update result:", updatedMeeting);
      
      if (!updatedMeeting) {
        console.error("Meeting not found:", meetingId);
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Also add to Documents table with "Meeting Notes" category
      try {
        const meeting = await storage.getMeeting(meetingId);
        const documentName = fileName.replace(/\.[^/.]+$/, ""); // Remove file extension
        const fileType = fileName.split('.').pop() || 'unknown';
        
        const documentData = {
          name: documentName,
          originalName: fileName,
          filePath: objectPath,
          fileSize: fileSize || 0,
          fileType: `application/${fileType}`,
          category: "Meeting Notes",
          description: meeting ? `Meeting minutes for: ${meeting.title}` : "Meeting minutes"
        };

        await storage.createDocument(documentData);
        console.log("Document also saved to Documents table with Meeting Notes category");
      } catch (docError) {
        console.error("Failed to save to Documents table:", docError);
        // Don't fail the main operation if document saving fails
      }

      const response = { 
        success: true,
        message: "Meeting minutes uploaded successfully",
        meeting: updatedMeeting 
      };
      console.log("Sending response:", response);
      res.json(response);
    } catch (error) {
      console.error('Meeting minutes upload error:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ 
        success: false,
        message: "Failed to update meeting minutes", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Delete meeting minutes endpoint
  app.delete("/api/meetings/:id/minutes", async (req, res) => {
    try {
      const meetingId = parseInt(req.params.id);
      
      // Clear minutes data from the meeting
      const updateData = {
        minutesFilePath: null,
        minutesFileName: null,
        minutesFileSize: null,
        minutesUploadedAt: null
      };

      const meeting = await storage.updateMeeting(meetingId, updateData);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      res.json({ 
        message: "Meeting minutes deleted successfully",
        meeting 
      });
    } catch (error) {
      console.error('Delete meeting minutes error:', error);
      res.status(500).json({ error: "Failed to delete meeting minutes" });
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

  // Email Templates routes
  app.get("/api/email-templates", async (req, res) => {
    const templates = await storage.getEmailTemplates();
    res.json(templates);
  });

  app.get("/api/email-templates/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const template = await storage.getEmailTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Email template not found" });
    }
    res.json(template);
  });

  app.get("/api/email-templates/language/:language", async (req, res) => {
    const language = req.params.language;
    const templates = await storage.getEmailTemplatesByLanguage(language);
    res.json(templates);
  });

  app.post("/api/email-templates", async (req, res) => {
    try {
      const data = insertEmailTemplateSchema.parse(req.body);
      const template = await storage.createEmailTemplate(data);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid email template data", error });
    }
  });

  app.put("/api/email-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertEmailTemplateSchema.partial().parse(req.body);
      const template = await storage.updateEmailTemplate(id, data);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }
      res.json(template);
    } catch (error) {
      res.status(400).json({ message: "Invalid email template data", error });
    }
  });

  app.delete("/api/email-templates/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteEmailTemplate(id);
    if (!success) {
      return res.status(404).json({ message: "Email template not found" });
    }
    res.status(204).send();
  });

  // Email Campaigns routes
  app.get("/api/email-campaigns", async (req, res) => {
    const campaigns = await storage.getEmailCampaigns();
    res.json(campaigns);
  });

  app.get("/api/email-campaigns/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const campaign = await storage.getEmailCampaign(id);
    if (!campaign) {
      return res.status(404).json({ message: "Email campaign not found" });
    }
    res.json(campaign);
  });

  app.post("/api/email-campaigns", async (req, res) => {
    try {
      const data = insertEmailCampaignSchema.parse(req.body);
      const campaign = await storage.createEmailCampaign(data);
      res.status(201).json(campaign);
    } catch (error) {
      res.status(400).json({ message: "Invalid email campaign data", error });
    }
  });

  // Send Earnings Report endpoint
  app.post("/api/email-campaigns/:id/send", async (req, res) => {
    try {
      const campaignId = parseInt(req.params.id);
      const { targetLanguage, targetRegion } = req.body;

      const campaign = await storage.getEmailCampaign(campaignId);
      if (!campaign) {
        return res.status(404).json({ message: "Email campaign not found" });
      }

      const template = await storage.getEmailTemplate(campaign.templateId);
      if (!template) {
        return res.status(404).json({ message: "Email template not found" });
      }

      // Get investors based on targeting criteria
      const allInvestors = await storage.getInvestors();
      const targetInvestors = allInvestors.filter(investor => {
        if (targetLanguage && investor.language !== targetLanguage) return false;
        if (targetRegion && investor.country !== targetRegion) return false;
        return true;
      });

      if (targetInvestors.length === 0) {
        return res.status(400).json({ message: "No investors match the targeting criteria" });
      }

      const result = await EmailService.sendEarningsReport({
        template,
        investors: targetInvestors,
        campaignName: campaign.name,
      });

      // Update campaign with results
      await storage.updateEmailCampaign(campaignId, {
        status: result.success ? 'completed' : 'failed',
        sentCount: result.sentCount,
        sentAt: new Date(),
      });

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to send campaign", error });
    }
  });

  // Get available template variables endpoint
  app.get("/api/email-templates/variables", async (req, res) => {
    const variables = EmailService.getAvailableVariables();
    res.json({ variables });
  });

  // Analysts routes
  app.get("/api/analysts", async (req, res) => {
    const analysts = await storage.getAnalysts();
    res.json(analysts);
  });

  app.get("/api/analysts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const analyst = await storage.getAnalyst(id);
    if (!analyst) {
      return res.status(404).json({ error: "Analyst not found" });
    }
    res.json(analyst);
  });

  app.post("/api/analysts", async (req, res) => {
    try {
      const analystData = insertAnalystSchema.parse(req.body);
      const analyst = await storage.createAnalyst(analystData);
      res.status(201).json(analyst);
    } catch (error) {
      res.status(400).json({ error: "Invalid analyst data", details: error });
    }
  });

  app.patch("/api/analysts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertAnalystSchema.partial().parse(req.body);
      const analyst = await storage.updateAnalyst(id, updateData);
      if (!analyst) {
        return res.status(404).json({ error: "Analyst not found" });
      }
      res.json(analyst);
    } catch (error) {
      res.status(400).json({ error: "Invalid analyst data", details: error });
    }
  });

  app.delete("/api/analysts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteAnalyst(id);
    if (!success) {
      return res.status(404).json({ error: "Analyst not found" });
    }
    res.json({ message: "Analyst deleted successfully" });
  });

  // CSV upload for analysts
  app.post("/api/analysts/upload", upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const results: any[] = [];
      const errors: string[] = [];
      
      const csvStream = Readable.from(req.file.buffer.toString('utf8'));
      
      await new Promise((resolve, reject) => {
        csvStream
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      const createdAnalysts = [];
      let skippedCount = 0;

      for (let index = 0; index < results.length; index++) {
        const row = results[index];
        try {
          // Flexible header mapping - support Korean and English headers
          const name = row['이름'] || row['Name'] || row['name'] || '';
          const company = row['회사'] || row['Company'] || row['company'] || '';
          const specialization = row['담당산업'] || row['Specialization'] || row['specialization'] || row['Industry'] || row['industry'] || '';
          const coverage = row['Coverage 여부'] || row['Coverage'] || row['coverage'] || row['커버리지여부'] || '';
          const email = row['이메일주소'] || row['Email'] || row['email'] || row['이메일'] || '';
          const phone = row['전화번호'] || row['Phone'] || row['phone'] || '';

          // Validate required fields
          if (!name.trim()) {
            errors.push(`Row ${index + 2}: Name is required / 이름은 필수입니다`);
            skippedCount++;
            continue;
          }

          if (!company.trim()) {
            errors.push(`Row ${index + 2}: Company is required / 회사는 필수입니다`);
            skippedCount++;
            continue;
          }

          // Normalize coverage values
          let normalizedCoverage = 'No';
          if (coverage && coverage.trim()) {
            const coverageValue = coverage.trim().toLowerCase();
            if (coverageValue === 'yes' || coverageValue === 'y' || coverageValue === '예' || coverageValue === 'true') {
              normalizedCoverage = 'Yes';
            }
          }

          const analystData = {
            name: name.trim(),
            email: email.trim() || '',
            phone: phone.trim() || '',
            company: company.trim(),
            position: '', // Will be set via form later
            specialization: specialization.trim() || '',
            coverage: '', // This maps to the coverage area field
            language: 'Korean',
            country: 'Korea', // Default value since field removed from form
            status: normalizedCoverage, // This is the coverage Yes/No field
            notes: ''
          };

          const createdAnalyst = await storage.createAnalyst(analystData);
          createdAnalysts.push(createdAnalyst);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          skippedCount++;
        }
      }

      res.json({
        message: `Successfully imported ${createdAnalysts.length} analysts. ${skippedCount} rows skipped.`,
        imported: createdAnalysts.length,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  });

  // Documents routes
  app.get("/api/documents", async (req, res) => {
    try {
      const documents = await storage.getDocuments();
      res.json(documents);
    } catch (error) {
      console.error('Get documents error:', error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocument(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error('Get document error:', error);
      res.status(500).json({ error: "Failed to fetch document" });
    }
  });

  app.post("/api/documents/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const file = req.file;
      const { category, description, investorId, companyId, tags } = req.body;

      // Validate file type (PDF, DOC, DOCX, etc.)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png'
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPEG, PNG" 
        });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${file.originalname}`;
      const filePath = `/uploads/${fileName}`;

      // In a real application, you would save the file to disk or cloud storage
      // For this demo, we'll just store the file info in the database
      
      const documentData = {
        name: file.originalname.split('.')[0], // Remove extension for display name
        originalName: file.originalname,
        filePath: filePath,
        fileSize: file.size,
        fileType: file.mimetype,
        category: category || 'General',
        description: description || '',
        uploadedBy: 'System'
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json({
        message: "File uploaded successfully",
        document
      });

    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = req.body;
      
      const document = await storage.updateDocument(id, updateData);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error('Update document error:', error);
      res.status(500).json({ error: "Failed to update document" });
    }
  });

  // Object storage upload endpoint
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint for updating document info after object storage upload
  app.post("/api/documents/upload-complete", async (req, res) => {
    try {
      const { uploadURL, fileName, fileSize, fileType, category, description, uploadedBy } = req.body;
      
      if (!uploadURL) {
        return res.status(400).json({ error: "uploadURL is required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(uploadURL);

      const documentData = {
        name: fileName ? fileName.split('.')[0] : 'Untitled',
        originalName: fileName || 'unknown',
        filePath: objectPath,
        fileSize: fileSize || 0,
        fileType: fileType || 'application/octet-stream',
        category: category || 'General',
        description: description || '',
        uploadedBy: uploadedBy || 'System'
      };

      const document = await storage.createDocument(documentData);
      res.status(201).json({
        message: "Document information saved successfully",
        document
      });

    } catch (error) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: "Failed to save document information" });
    }
  });

  // Serve uploaded objects
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      await objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.status(404).json({ error: "Object not found" });
      }
      return res.status(500).json({ error: "Failed to serve object" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteDocument(id);
      if (!success) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error('Delete document error:', error);
      res.status(500).json({ error: "Failed to delete document" });
    }
  });

  app.get("/api/documents/category/:category", async (req, res) => {
    try {
      const category = req.params.category;
      const documents = await storage.getDocumentsByCategory(category);
      res.json(documents);
    } catch (error) {
      console.error('Get documents by category error:', error);
      res.status(500).json({ error: "Failed to fetch documents by category" });
    }
  });

  // Securities Firms routes
  app.get("/api/securities-firms", async (req, res) => {
    try {
      const firms = await storage.getSecuritiesFirms();
      res.json(firms);
    } catch (error) {
      console.error('Get securities firms error:', error);
      res.status(500).json({ error: "Failed to fetch securities firms" });
    }
  });

  app.get("/api/securities-firms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const firm = await storage.getSecuritiesFirm(id);
      if (!firm) {
        return res.status(404).json({ message: "Securities firm not found" });
      }
      res.json(firm);
    } catch (error) {
      console.error('Get securities firm error:', error);
      res.status(500).json({ error: "Failed to fetch securities firm" });
    }
  });

  app.post("/api/securities-firms", async (req, res) => {
    try {
      const firmData = insertSecuritiesFirmSchema.parse(req.body);
      const firm = await storage.createSecuritiesFirm(firmData);
      res.status(201).json(firm);
    } catch (error) {
      res.status(400).json({ error: "Invalid securities firm data", details: error });
    }
  });

  app.patch("/api/securities-firms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertSecuritiesFirmSchema.partial().parse(req.body);
      const firm = await storage.updateSecuritiesFirm(id, updateData);
      if (!firm) {
        return res.status(404).json({ error: "Securities firm not found" });
      }
      res.json(firm);
    } catch (error) {
      res.status(400).json({ error: "Invalid securities firm data", details: error });
    }
  });

  app.delete("/api/securities-firms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSecuritiesFirm(id);
      if (!success) {
        return res.status(404).json({ error: "Securities firm not found" });
      }
      res.json({ message: "Securities firm deleted successfully" });
    } catch (error) {
      console.error('Delete securities firm error:', error);
      res.status(500).json({ error: "Failed to delete securities firm" });
    }
  });

  // CSV upload for securities firms
  app.post("/api/securities-firms/upload", upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const results: any[] = [];
      const errors: string[] = [];
      
      const csvStream = Readable.from(req.file.buffer.toString('utf8'));
      
      await new Promise((resolve, reject) => {
        csvStream
          .pipe(csvParser())
          .on('data', (data) => results.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      const createdFirms = [];
      let skippedCount = 0;



      for (let index = 0; index < results.length; index++) {
        const row = results[index];
        try {
          // Flexible header mapping - support Korean and English headers
          const name = row['이름'] || row['Name'] || row['name'] || row['회사명'] || row['Company'] || row['증권사'] || '';
          const address = row['주소'] || row['Address'] || row['address'] || '';
          const phone = row['대표번호'] || row['전화번호'] || row['Phone'] || row['phone'] || row['대표전화'] || '';
          const website = row['웹사이트'] || row['Website'] || row['website'] || row['URL'] || row['url'] || '';

          // Validate required fields
          if (!name.trim()) {
            errors.push(`Row ${index + 2}: Name is required / 이름은 필수입니다`);
            skippedCount++;
            continue;
          }

          if (!address.trim()) {
            errors.push(`Row ${index + 2}: Address is required / 주소는 필수입니다`);
            skippedCount++;
            continue;
          }

          if (!phone.trim()) {
            errors.push(`Row ${index + 2}: Phone is required / 전화번호는 필수입니다`);
            skippedCount++;
            continue;
          }

          // Check if firm already exists
          const existingFirms = await storage.getSecuritiesFirms();
          const existingFirm = existingFirms.find(f => 
            f.name.trim().toLowerCase() === name.trim().toLowerCase()
          );
          
          if (existingFirm) {
            errors.push(`Row ${index + 2}: Securities firm "${name}" already exists / 증권사 "${name}"가 이미 존재합니다`);
            skippedCount++;
            continue;
          }

          const firmData = {
            name: name.trim(),
            address: address.trim(),
            phone: phone.trim(),
            website: website.trim() || undefined,
            status: 'active'
          };

          const createdFirm = await storage.createSecuritiesFirm(firmData);
          createdFirms.push(createdFirm);
        } catch (error) {
          errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          skippedCount++;
        }
      }

      res.json({
        message: `Successfully imported ${createdFirms.length} securities firms`,
        created: createdFirms.length,
        skipped: skippedCount,
        errors: errors.length > 0 ? errors : undefined
      });

    } catch (error) {
      console.error('CSV upload error:', error);
      res.status(500).json({ error: "Failed to process CSV file" });
    }
  });

  // Email sending endpoint
  app.post("/api/email/send", async (req, res) => {
    try {
      const { subject, content, recipients, attachments } = req.body;
      
      // Get recipient emails
      const investorEmails: string[] = [];
      const analystEmails: string[] = [];
      
      if (recipients.investors && recipients.investors.length > 0) {
        for (const investorId of recipients.investors) {
          const investor = await storage.getInvestor(investorId);
          if (investor && investor.email) {
            investorEmails.push(investor.email);
          }
        }
      }
      
      if (recipients.analysts && recipients.analysts.length > 0) {
        for (const analystId of recipients.analysts) {
          const analyst = await storage.getAnalyst(analystId);
          if (analyst && analyst.email) {
            analystEmails.push(analyst.email);
          }
        }
      }
      
      const allEmails = [...investorEmails, ...analystEmails];
      
      if (allEmails.length === 0) {
        return res.status(400).json({ error: "No valid email addresses found for selected recipients" });
      }
      
      // Get attachment files if any
      const attachmentFiles: any[] = [];
      if (attachments && attachments.length > 0) {
        for (const docId of attachments) {
          const document = await storage.getDocument(docId);
          if (document) {
            attachmentFiles.push({
              filename: document.originalName,
              path: document.filePath,
              contentType: document.fileType
            });
          }
        }
      }
      
      // Send emails using EmailService
      const results = [];
      for (const email of allEmails) {
        try {
          const success = await EmailService.sendSingleEmail({
            to: email,
            subject: subject,
            html: content.replace(/\n/g, '<br>'),
            from: 'noreply@ircrm.com'
          });
          results.push({ email, success });
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          results.push({ email, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }
      
      res.json({ 
        message: "Email sending completed", 
        results,
        totalSent: results.filter(r => r.success).length,
        totalFailed: results.filter(r => !r.success).length
      });
      
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ error: "Failed to send emails" });
    }
  });

  // Object Storage routes
  // The endpoint for serving private objects.
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // The endpoint for getting the upload URL for an object entity.
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    const uploadURL = await objectStorageService.getObjectEntityUploadURL();
    res.json({ uploadURL });
  });

  // This endpoint is used to serve public assets.
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // Document upload endpoint that saves to object storage and creates database record
  app.post("/api/documents/upload", async (req, res) => {
    if (!req.body.uploadURL || !req.body.fileName || !req.body.fileSize || !req.body.fileType) {
      return res.status(400).json({ error: "uploadURL, fileName, fileSize, and fileType are required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(
        req.body.uploadURL,
      );

      // Create document record in database
      const documentData = {
        name: req.body.fileName,
        originalName: req.body.fileName,
        filePath: objectPath,
        fileSize: parseInt(req.body.fileSize),
        fileType: req.body.fileType,
        category: req.body.category || "Meeting Document",
        description: req.body.description || "",
        uploadedBy: req.body.uploadedBy || "System",
        tags: req.body.tags ? [req.body.tags] : [],
        investorId: req.body.investorId ? parseInt(req.body.investorId) : null,
        companyId: req.body.companyId ? parseInt(req.body.companyId) : null,
      };

      const document = await storage.createDocument(documentData);

      res.status(200).json({
        document,
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error saving document:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Object Storage Routes for Meeting Minutes
  
  // Get upload URL for meeting minutes
  app.post("/api/objects/upload", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Serve private object files (meeting minutes)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(
        req.path,
      );
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error downloading object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Update meeting with uploaded minutes file
  app.put("/api/meetings/:id/minutes", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { minutesFileURL, minutesFileName, minutesFileSize } = req.body;
      
      if (!minutesFileURL || !minutesFileName) {
        return res.status(400).json({ error: "minutesFileURL and minutesFileName are required" });
      }

      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(minutesFileURL);
      
      // Update meeting with minutes information
      const updateData = {
        minutesFilePath: objectPath,
        minutesFileName,
        minutesFileSize: minutesFileSize || null,
        minutesUploadedAt: new Date()
      };

      const meeting = await storage.updateMeeting(id, updateData);
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }

      res.json({ 
        meeting,
        message: "Meeting minutes uploaded successfully" 
      });
    } catch (error) {
      console.error("Error updating meeting with minutes:", error);
      res.status(500).json({ error: "Failed to update meeting with minutes" });
    }
  });

  // Get meeting minutes download URL
  app.get("/api/meetings/:id/minutes", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const meeting = await storage.getMeeting(id);
      
      if (!meeting) {
        return res.status(404).json({ error: "Meeting not found" });
      }
      
      if (!meeting.minutesFilePath) {
        return res.status(404).json({ error: "No meeting minutes found for this meeting" });
      }

      // Return meeting minutes info
      res.json({
        fileName: meeting.minutesFileName,
        filePath: meeting.minutesFilePath,
        fileSize: meeting.minutesFileSize,
        uploadedAt: meeting.minutesUploadedAt,
        downloadUrl: meeting.minutesFilePath // This will be used to download the file
      });
    } catch (error) {
      console.error("Error getting meeting minutes:", error);
      res.status(500).json({ error: "Failed to get meeting minutes" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
