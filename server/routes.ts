import type { Express } from "express";
import { createServer, type Server } from "http";
import multer from "multer";
import csvParser from "csv-parser";
import { Readable } from "stream";
import { storage } from "./storage";
import { 
  insertInvestorSchema, 
  insertOverseasInvestorSchema,
  insertCompanySchema, 
  insertOverseasCompanySchema,
  insertInvestmentSchema, 
  insertCommunicationSchema,
  insertMeetingSchema,
  insertFundSchema,
  insertOverseasFundSchema,
  insertMeetingLogSchema,
  insertNdrConferenceSchema,
  insertOtherEventSchema,
  insertEmailTemplateSchema,
  insertEmailCampaignSchema,
  insertAnalystSchema,
  insertDocumentSchema,
  insertSecuritiesFirmSchema,
  insertEmailLogSchema,
  insertUserSchema,
  insertInvestorInsightSchema,
  insertAnalystReportSchema
} from "@shared/schema";
import { aiService } from "./ai-service";
import { EmailService } from "./email-service";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { AIAnalysisService } from "./aiAnalysisService";

// 동적 도메인 매핑 캐시
let domainMappingCache: Record<string, number> | null = null;

// 캐시 초기화 함수
function clearDomainMappingCache() {
  domainMappingCache = null;
  console.log("🗑️ Domain mapping cache cleared");
}

// DB에서 조직 도메인 매핑을 가져오는 함수
async function fetchDomainMapping(): Promise<Record<string, number>> {
  if (domainMappingCache) {
    return domainMappingCache;
  }
  
  try {
    const organizations = await storage.getAllOrganizations();
    const mapping: Record<string, number> = {};
    
    organizations.forEach((org: any) => {
      mapping[org.domain] = org.id;
      // .com 제거한 버전도 매핑 추가
      if (org.domain.endsWith('.com')) {
        mapping[org.domain.replace('.com', '')] = org.id;
      }
    });
    
    domainMappingCache = mapping;
    console.log("🗺️ Backend domain mapping loaded:", mapping);
    return mapping;
  } catch (error) {
    console.error("Failed to fetch domain mapping:", error);
    // 에러 시 기본 매핑 사용
    return {
      'default': 1,
      'default.com': 1,
      'samsung': 2,
      'demo': 3
    };
  }
}

// Middleware to extract organization ID from various sources
async function extractOrganizationId(req: any): Promise<number> {
  console.log('🔍 Extracting organization ID from request:', {
    method: req.method,
    path: req.path,
    headers: {
      'x-organization-id': req.headers['x-organization-id'],
      'x-organization': req.headers['x-organization']
    },
    query: req.query
  });
  
  // Check header: X-Organization-Id (from frontend)
  if (req.headers['x-organization-id']) {
    const orgId = parseInt(req.headers['x-organization-id']);
    if (!isNaN(orgId)) {
      console.log('✅ Using organization ID from X-Organization-Id header:', orgId);
      return orgId;
    }
  }
  
  const domainMapping = await fetchDomainMapping();
  
  // Check URL path: /org/samsung/investors
  const orgFromPath = req.path.match(/^\/org\/([^\/]+)/);
  if (orgFromPath) {
    const domain = orgFromPath[1];
    const mappedOrgId = domainMapping[domain] || 1;
    console.log('🗂️ Using organization ID from URL path:', { domain, mappedOrgId });
    return mappedOrgId;
  }
  
  // Check query parameter: ?org=samsung
  if (req.query.org) {
    const mappedOrgId = domainMapping[req.query.org] || 1;
    console.log('🔗 Using organization ID from query parameter:', { org: req.query.org, mappedOrgId });
    return mappedOrgId;
  }
  
  // Check header: X-Organization (domain)
  if (req.headers['x-organization']) {
    const mappedOrgId = domainMapping[req.headers['x-organization']] || 1;
    console.log('🏢 Using organization ID from X-Organization header:', { domain: req.headers['x-organization'], mappedOrgId });
    return mappedOrgId;
  }
  
  // Default to organization 1
  console.log('⚠️ Defaulting to organization ID 1 - no valid source found');
  return 1;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file upload
  const upload = multer({ storage: multer.memoryStorage() });
  
  // Middleware to add organization-specific cache headers
  app.use('/api', async (req, res, next) => {
    // Skip organization extraction for global endpoints
    const skipOrgExtraction = ['/api/domain-mapping', '/api/organizations'].includes(req.path);
    
    if (skipOrgExtraction) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      return next();
    }
    
    const orgId = await extractOrganizationId(req);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Organization-Context', orgId.toString());
    next();
  });
  
  // Domain mapping route (no organization filtering)
  app.get("/api/domain-mapping", async (req, res) => {
    try {
      const domainMapping = await fetchDomainMapping();
      res.json(domainMapping);
    } catch (error) {
      console.error("Failed to get domain mapping:", error);
      res.status(500).json({ message: "Failed to get domain mapping", error });
    }
  });

  // Organizations routes
  app.get("/api/organizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organization = await storage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ message: "Organization not found" });
      }
      res.json(organization);
    } catch (error) {
      res.status(500).json({ message: "Failed to get organization", error });
    }
  });

  // Investors routes
  app.get("/api/investors", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const investors = await storage.getInvestors(organizationId);
    res.json(investors);
  });

  app.get("/api/investors/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const investor = await storage.getInvestor(id, organizationId);
    if (!investor) {
      return res.status(404).json({ message: "Investor not found" });
    }
    res.json(investor);
  });

  app.post("/api/investors", async (req, res) => {
    try {
      // Skip validation completely and directly create
      const data = { ...req.body };
      
      // Convert numeric fields if they're strings
      if (data.managedFundAum !== undefined && data.managedFundAum !== null && data.managedFundAum !== '') {
        data.managedFundAum = typeof data.managedFundAum === 'string' ? parseFloat(data.managedFundAum) : data.managedFundAum;
      }
      if (data.totalAssets !== undefined && data.totalAssets !== null && data.totalAssets !== '') {
        data.totalAssets = typeof data.totalAssets === 'string' ? parseFloat(data.totalAssets) : data.totalAssets;
      }
      if (data.numberOfManagedFunds !== undefined && data.numberOfManagedFunds !== null && data.numberOfManagedFunds !== '') {
        data.numberOfManagedFunds = typeof data.numberOfManagedFunds === 'string' ? parseInt(data.numberOfManagedFunds) : data.numberOfManagedFunds;
      }
      
      const organizationId = await extractOrganizationId(req);
      const investor = await storage.createInvestor(data, organizationId);
      res.status(201).json(investor);
    } catch (error) {
      console.error('Create investor error:', error);
      res.status(400).json({ message: "Invalid investor data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.put("/api/investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertInvestorSchema.partial().parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const investor = await storage.updateInvestor(id, data, organizationId);
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
      
      // Skip validation completely and directly update
      const data = { ...req.body };
      
      // Convert numeric fields if they're strings
      if (data.managedFundAum !== undefined && data.managedFundAum !== null && data.managedFundAum !== '') {
        data.managedFundAum = typeof data.managedFundAum === 'string' ? parseFloat(data.managedFundAum) : data.managedFundAum;
      }
      if (data.totalAssets !== undefined && data.totalAssets !== null && data.totalAssets !== '') {
        data.totalAssets = typeof data.totalAssets === 'string' ? parseFloat(data.totalAssets) : data.totalAssets;
      }
      if (data.numberOfManagedFunds !== undefined && data.numberOfManagedFunds !== null && data.numberOfManagedFunds !== '') {
        data.numberOfManagedFunds = typeof data.numberOfManagedFunds === 'string' ? parseInt(data.numberOfManagedFunds) : data.numberOfManagedFunds;
      }
      
      const organizationId = await extractOrganizationId(req);
      const investor = await storage.updateInvestor(id, data, organizationId);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      res.json(investor);
    } catch (error) {
      console.error('Update investor error:', error);
      res.status(400).json({ message: "Invalid investor data", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  app.delete("/api/investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      const organizationId = await extractOrganizationId(req);
      
      // Check if investor exists
      const investor = await storage.getInvestor(id, organizationId);
      if (!investor) {
        return res.status(404).json({ message: "Investor not found" });
      }
      
      // Check if investor has related meeting logs
      const meetingLogs = await storage.getMeetingLogsByInvestor(id);
      if (meetingLogs.length > 0) {
        return res.status(409).json({ 
          message: "Cannot delete investor with existing meeting logs",
          details: `This investor has ${meetingLogs.length} meeting log(s). Please delete the meeting logs first.`
        });
      }
      
      const deleted = await storage.deleteInvestor(id, organizationId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete investor" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting investor:', error);
      res.status(500).json({ 
        message: "Failed to delete investor", 
        error: error.message 
      });
    }
  });

  // Clear all investor emails
  app.patch('/api/investors/clear-emails', async (req, res) => {
    try {
      await storage.clearAllEmails();
      res.json({ message: 'All emails cleared successfully' });
    } catch (error) {
      console.error('Error clearing emails:', error);
      res.status(500).json({ message: 'Failed to clear emails' });
    }
  });

  // Investor CSV upload
  app.post("/api/investors/upload-csv", upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    try {
      const results: any[] = [];
      const readable = Readable.from(req.file.buffer);
      
      readable
        .pipe(csvParser())
        .on('data', (data) => {
          // Skip rows where all main fields are empty
          const hasData = data['운용사'] || data['성명'] || data['company'] || data['name'];
          if (hasData) {
            results.push(data);
          }
        })
        .on('end', async () => {
          try {
            console.log('CSV parsing results:', results.slice(0, 5)); // Debug first 5 rows
            console.log('Total rows:', results.length);
            
            const investors = results.map((row, index) => {
              // Clean up keys by removing BOM, newlines, and trimming
              const cleanRow: any = {};
              Object.keys(row).forEach(key => {
                const cleanKey = key
                  .replace(/\uFEFF/g, '')      // Remove BOM
                  .replace(/\r?\n/g, ' ')      // Replace newlines with space
                  .replace(/\s+/g, ' ')        // Normalize spaces
                  .trim();                     // Trim
                  
                const value = row[key] ? row[key].toString().trim() : '';
                cleanRow[cleanKey] = value;
                
                // Also keep original key for fallback
                if (cleanKey !== key) {
                  cleanRow[key] = value;
                }
              });
              
              // Parse experience strings like "10년7개월"
              const parseExperience = (exp: string) => {
                if (!exp || exp === '' || exp.trim() === '') return null;
                return exp.trim();
              };

              // Parse amount strings like "1,624,589" (백만원) - ALWAYS return string for decimal type
              const parseAmount = (amount: string) => {
                if (!amount || amount === '' || amount.trim() === '') return null;
                const cleanAmount = amount.replace(/[,\s"]/g, '').trim();
                const parsed = parseFloat(cleanAmount);
                if (isNaN(parsed)) return null;
                console.log(`Parsing amount: '${amount}' -> '${cleanAmount}' (string)`);
                return String(cleanAmount); // FORCE string conversion
              };
              
              // Try to find the assets field - exact column name from CSV
              const assetFields = [
                '설정원본 (백만원)',  // After cleaning: "설정원본 (백만원)"
                '설정원본\n(백만원)',    // Original with newline
                '설정원본(백만원)',     // Without space
                '설정원본',                     // Just "설정원본"
                'assets',
                'totalAssets'
              ];
              
              let totalAssets = null;
              for (const field of assetFields) {
                const value = cleanRow[field] || row[field];
                if (value) {
                  totalAssets = parseAmount(value);
                  if (totalAssets !== null) {
                    console.log(`Found assets in field '${field}': '${totalAssets}' (type: ${typeof totalAssets})`);
                    break;
                  }
                }
              }

              // Email generation disabled - keeping empty as requested
              const generateEmail = (name: string, company: string) => {
                return ''; // Always return empty email
              };

              // Try multiple ways to get the company and name
              const name = (cleanRow['성명'] || row['성명'] || cleanRow['name'] || '').trim();
              const company = (cleanRow['운용사'] || row['운용사'] || cleanRow['company'] || '').trim();
              
              console.log(`Processing row ${index}: name=${name}, company=${company}`);
              console.log(`Available keys:`, Object.keys(cleanRow));
              console.log(`Raw row keys:`, Object.keys(row));
              console.log(`CleanRow content:`, cleanRow);
              
              // Leave email empty as requested by user
              const email = '';
              console.log(`Empty email for ${name}`);

              const result = {
                name,
                email,
                company,
                phone: (cleanRow['phone'] || row['phone'] || cleanRow['연락처'] || row['연락처'] || '').trim(),
                position: (cleanRow['position'] || row['position'] || cleanRow['직책'] || row['직책'] || 'Fund Manager').trim(),
                positionType: 'PM', // Default to Portfolio Manager
                totalExperience: parseExperience(cleanRow['총 운용경력'] || row['총 운용경력'] || cleanRow['총운용경력']),
                currentCompanyExperience: parseExperience(cleanRow['현회사 운용경력'] || row['현회사 운용경력'] || cleanRow['현회사운용경력']),
                numberOfManagedFunds: parseInt(cleanRow['펀드수'] || row['펀드수'] || cleanRow['운용펀드수'] || row['운용펀드수']) || 0,
                totalAssets,
                specialty: [cleanRow['전문분야'] || row['전문분야'] || cleanRow['specialty'] || row['specialty'] || ''].filter(s => s),
                country: 'Korea',
                language: 'Korean',
                avatarInitials: name.length >= 2 ? name.substring(0, 2).toUpperCase() : 'FM'
              };
              
              if (index < 5) {
                console.log(`\n=== Row ${index} ===`);
                console.log('Raw row:', row);
                console.log('Clean row keys:', Object.keys(cleanRow));
                console.log('Result:', result);
                console.log('=================\n');
              }
              
              return result;
            });

            // Validate and insert investors
            const created = [];
            console.log(`Total investors to process: ${investors.length}`);
            for (const inv of investors) {
              console.log(`Checking investor: company='${inv.company}', name='${inv.name}', email='${inv.email}'`);
              if (inv.company && inv.name) {
                try {
                  // FORCE convert totalAssets to string if it exists
                  if (inv.totalAssets !== null && inv.totalAssets !== undefined) {
                    inv.totalAssets = String(inv.totalAssets);
                  }
                  
                  const validatedData = insertInvestorSchema.parse(inv);
                  const organizationId = await extractOrganizationId(req);
                  const createdInvestor = await storage.createInvestor(validatedData, organizationId);
                  created.push(createdInvestor);
                  console.log(`Successfully created investor: ${inv.name}`);
                } catch (validationError) {
                  console.error('Validation error for investor:', inv, validationError);
                }
              } else {
                console.log(`Skipping investor due to missing required fields: company='${inv.company}', name='${inv.name}'`);
              }
            }

            res.json({ 
              message: `Successfully imported ${created.length} investors`,
              imported: created.length,
              total: results.length
            });
          } catch (error) {
            console.error('Error processing investors:', error);
            res.status(500).json({ message: "Error processing investors", error });
          }
        });
    } catch (error) {
      console.error('Error uploading investors CSV:', error);
      res.status(500).json({ message: "Error uploading CSV", error });
    }
  });

  // Overseas Investors routes
  app.get("/api/overseas-investors", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const investors = await storage.getOverseasInvestors(organizationId);
    res.json(investors);
  });

  app.get("/api/overseas-investors/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const investor = await storage.getOverseasInvestor(id, organizationId);
    if (!investor) {
      return res.status(404).json({ message: "Overseas investor not found" });
    }
    res.json(investor);
  });

  app.post("/api/overseas-investors", async (req, res) => {
    try {
      console.log("Overseas investor request body:", req.body);
      const data = insertOverseasInvestorSchema.parse(req.body);
      console.log("Parsed data:", data);
      const organizationId = await extractOrganizationId(req);
      const investor = await storage.createOverseasInvestor(data, organizationId);
      res.status(201).json(investor);
    } catch (error) {
      console.error("Error creating overseas investor:", error);
      res.status(400).json({ message: "Invalid overseas investor data", error });
    }
  });

  app.put("/api/overseas-investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const data = insertOverseasInvestorSchema.partial().parse(req.body);
      const investor = await storage.updateOverseasInvestor(id, data, organizationId);
      if (!investor) {
        return res.status(404).json({ message: "Overseas investor not found" });
      }
      res.json(investor);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas investor data", error });
    }
  });

  app.patch("/api/overseas-investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const data = insertOverseasInvestorSchema.partial().parse(req.body);
      const investor = await storage.updateOverseasInvestor(id, data, organizationId);
      if (!investor) {
        return res.status(404).json({ message: "Overseas investor not found" });
      }
      res.json(investor);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas investor data", error });
    }
  });

  app.delete("/api/overseas-investors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      
      const investor = await storage.getOverseasInvestor(id, organizationId);
      if (!investor) {
        return res.status(404).json({ message: "Overseas investor not found" });
      }
      
      const deleted = await storage.deleteOverseasInvestor(id, organizationId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete overseas investor" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting overseas investor:', error);
      res.status(500).json({ 
        message: "Failed to delete overseas investor", 
        error: error.message 
      });
    }
  });

  // Companies routes
  app.get("/api/companies", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const companies = await storage.getCompanies(organizationId);
    res.json(companies);
  });

  app.post("/api/companies", async (req, res) => {
    try {
      console.log('🏢 Company creation request body:', req.body);
      const data = insertCompanySchema.parse(req.body);
      console.log('✅ Parsed data:', data);
      
      // Store AUM value directly as entered (in billions)
      // No conversion needed since UI displays in billions and database stores the actual value
      if (data.aum) {
        const aumValue = parseFloat(data.aum);
        data.aum = aumValue.toString();
        // Auto-calculate AUM in KRW (trillion won) with 1.4x multiplier
        data.aumKrw = (aumValue * 1.4).toString();
      }
      const organizationId = await extractOrganizationId(req);
      console.log('🏢 Creating company with organizationId:', organizationId);
      const company = await storage.createCompany(data, organizationId);
      res.status(201).json(company);
    } catch (error) {
      console.error('❌ Company creation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ 
        message: "Invalid company data", 
        error: error instanceof Error ? error.message : String(error),
        details: error
      });
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
      const organizationId = await extractOrganizationId(req);
      const company = await storage.updateCompany(id, data, organizationId);
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
    const organizationId = await extractOrganizationId(req);
    const deleted = await storage.deleteCompany(id, organizationId);
    if (!deleted) {
      return res.status(404).json({ message: "Company not found" });
    }
    res.status(204).send();
  });

  app.put("/api/companies/:id/archive", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const company = await storage.updateCompany(id, { status: 'archived' }, organizationId);
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
      const organizationId = await extractOrganizationId(req);
      const company = await storage.updateCompany(id, { status: 'active' }, organizationId);
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
      console.log('📁 CSV 업로드 시작:', {
        fileName: req.file?.originalname,
        fileSize: req.file?.size,
        mimeType: req.file?.mimetype
      });

      if (!req.file) {
        return res.status(400).json({ message: "No CSV file uploaded" });
      }

      const organizationId = await extractOrganizationId(req);
      console.log('🏢 CSV 업로드 조직 ID:', organizationId);

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
              
              // Remove newlines and normalize header
              const normalized = header.toLowerCase().replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
              console.log(`Mapping header: "${header}" -> normalized: "${normalized}"`);
              
              switch (normalized) {
                case 'name':
                case 'company name':
                case 'company name / 회사명':
                case 'company':
                case '회사명':
                  return 'name';
                case 'hq location':
                case 'hq location / 본사 위치':
                case 'hq':
                case 'location':
                case 'headquarters':
                case 'hq_location':
                case '본사 위치':
                  return 'hqLocation';
                case 'aum (억원)':
                  console.log(`Mapping "aum (억원)" to aumWon`);
                  return 'aumWon';  // Map to dedicated field for 억원 data
                case 'aum':
                case 'assets under management':
                case 'total aum':
                case 'aum (bil)':
                case 'aum ($bil)':
                case 'aum (billion usd)':
                case 'aum_bil':
                case '운용자산':
                  return 'aum';
                case 'type':
                case 'type / 유형':
                case 'company type':
                case 'fund type':
                case 'investment_type':
                case '유형':
                  return 'type';
                case 'area':
                case 'area / 지역':
                case 'region':
                case 'geography':
                case 'investment_area':
                case '지역':
                  return 'area';
                case 'area(지역)':
                  console.log(`Mapping "area(지역)" to areaKor`);
                  return 'areaKor'; // Map to dedicated field for Korean area data
                case '펀드 매니저수':
                case '펀드 매니저수':
                case 'fund manager count':
                case 'fund managers':
                case 'managers':
                  return 'fundManagerCount';
                case '설립일자':
                case 'established date':
                case 'establishment date':
                case 'founding date':
                case 'founded':
                  return 'establishedDate';
                case '주소':
                case 'address':
                case 'location':
                case 'office address':
                  return 'address';
                case 'tel':
                case 'phone':
                case 'telephone':
                case '전화번호':
                case '연락처':
                  return 'phone';
                case 'web주소':
                case 'website':
                case 'web':
                case 'homepage':
                case 'url':
                  return 'website';
                default:
                  console.log(`No mapping for header: "${header}", keeping as: "${header}"`);
                  return header;
              }
            }
          }))
          .on('data', (data) => {
            lineNumber++;
            
            // Log first few data rows for debugging
            if (lineNumber <= 3) {
              console.log(`Row ${lineNumber-1} data:`, data);
              console.log(`Row ${lineNumber-1} data keys:`, Object.keys(data));
            }
            
            try {
              // Extract required fields with fallbacks
              const nameValue = data.name;
              const hqLocationValue = data.hqLocation;
              const typeValue = data.type;
              const aumFromWonColumn = data.aumWon;
              const aumFromMappedColumn = data.aum;
              const areaValue = data.area || data.areaKor || 'Korea';
              
              // Extract new optional fields
              const fundManagerCountValue = data.fundManagerCount;
              const establishedDateValue = data.establishedDate;
              const addressValue = data.address;
              const phoneValue = data.phone;
              const websiteValue = data.website;
              
              console.log(`Line ${lineNumber} debugging:`, {
                name: nameValue,
                hqLocation: hqLocationValue,
                type: typeValue,
                aumWon: aumFromWonColumn,
                aum: aumFromMappedColumn,
                area: areaValue,
                allKeys: Object.keys(data)
              });
              
              // Check only essential required fields for Korean companies
              const missingFields = [];
              if (!nameValue || nameValue.toString().trim() === '') missingFields.push('name');
              // For Korean companies, hqLocation and type are optional since we can default them
              // if (!hqLocationValue || hqLocationValue.toString().trim() === '') missingFields.push('hqLocation');
              // if (!typeValue || typeValue.toString().trim() === '') missingFields.push('type');

              if (missingFields.length > 0) {
                console.log(`Line ${lineNumber} missing fields:`, missingFields);
                errors.push(`Line ${lineNumber}: Missing required fields: ${missingFields.join(', ')}`);
                return;
              }

              // Use the extracted field values with defaults for Korean companies
              const finalName = nameValue.toString().trim();
              const finalHqLocation = hqLocationValue ? hqLocationValue.toString().trim() : '서울'; // Default to Seoul
              const finalType = typeValue ? typeValue.toString().trim() : 'Asset Management'; // Default type for Korean companies
              const finalArea = areaValue.toString().trim() || 'Korea';
              const finalAum = (aumFromWonColumn || aumFromMappedColumn || '0').toString().trim();

              // Type is now defaulted for Korean companies, no validation needed

              // Area is optional - no validation needed since schema allows null

              // Parse AUM value - handle Korean number format with commas and spaces
              const parseAumValue = (aumString: string): number => {
                // Remove common prefixes, suffixes, spaces, and commas
                let cleanedAum = aumString
                  .replace(/[>~$+\s]/g, '') // Remove >, ~, $, +, spaces
                  .replace(/,/g, '') // Remove commas
                  .replace(/"/g, '') // Remove quotes
                  .replace(/\s*\(.*?\)\s*/g, '') // Remove parenthetical content
                  .replace(/[Bb]/g, '') // Remove B for billions
                  .trim();
                
                const numericValue = parseFloat(cleanedAum);
                return numericValue;
              };
              
              const aumNumericValue = parseAumValue(finalAum);
              if (isNaN(aumNumericValue) || aumNumericValue <= 0) {
                // Skip companies with no AUM data instead of erroring
                console.log(`Skipping line ${lineNumber} (${finalName}): No valid AUM data`);
                return;
              }

              // Store AUM value directly (already in 억원 from CSV)
              const aumInFullAmount = aumNumericValue.toString();

              const companyData = {
                name: finalName,
                hqLocation: finalHqLocation,
                aum: aumInFullAmount, // This is now in 억원 units
                aumKrw: aumInFullAmount, // Same as aum since it's already in 억원
                type: finalType,
                area: finalArea,
                // Add new optional fields
                fundManagerCount: fundManagerCountValue ? parseInt(fundManagerCountValue.toString().trim()) : null,
                establishedDate: establishedDateValue ? establishedDateValue.toString().trim() : null,
                address: addressValue ? addressValue.toString().trim() : null,
                phone: phoneValue ? phoneValue.toString().trim() : null,
                website: websiteValue ? websiteValue.toString().trim() : null
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
            requiredColumns: ["Name", "HQ Location", "AUM (in bil)", "Type"],
            optionalColumns: ["Area"],
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
      console.log('💾 회사 데이터베이스 저장 시작:', {
        totalParsedRows: results.length,
        organizationId: organizationId
      });

      const createdCompanies = [];
      for (const companyData of results) {
        try {
          console.log('🏢 회사 생성 시도:', {
            name: companyData.name,
            data: companyData
          });

          // Schema validation
          const validatedData = insertCompanySchema.parse(companyData);
          console.log('✅ 스키마 검증 성공:', validatedData);

          // Check if company already exists
          const existingCompany = await storage.getCompanies(organizationId);
          const duplicate = existingCompany.find(c => c.name.toLowerCase() === companyData.name.toLowerCase());
          
          if (duplicate) {
            console.log(`❌ 중복 회사 발견: ${companyData.name}`);
            errors.push(`Company "${companyData.name}" already exists in database`);
            continue;
          }
          
          const company = await storage.createCompany(validatedData, organizationId);
          console.log('✅ 회사 생성 성공:', company.name);
          createdCompanies.push(company);
        } catch (error: any) {
          console.error('❌ 회사 생성 실패:', {
            companyName: companyData.name,
            error: error.message,
            stack: error.stack
          });
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
      console.error('❌ CSV 업로드 전체 오류:', {
        error: error.message,
        stack: error.stack,
        fileName: req.file?.originalname
      });
      res.status(500).json({ 
        message: "Failed to process CSV file", 
        error: error.message,
        details: error.stack
      });
    }
  });

  // Overseas Companies routes
  app.get("/api/overseas-companies", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const companies = await storage.getOverseasCompanies(organizationId);
    res.json(companies);
  });

  app.get("/api/overseas-companies/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const company = await storage.getOverseasCompany(id, organizationId);
    if (!company) {
      return res.status(404).json({ message: "Overseas company not found" });
    }
    res.json(company);
  });

  app.post("/api/overseas-companies", async (req, res) => {
    try {
      const data = insertOverseasCompanySchema.parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const company = await storage.createOverseasCompany(data, organizationId);
      res.status(201).json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas company data", error });
    }
  });

  app.put("/api/overseas-companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const data = insertOverseasCompanySchema.partial().parse(req.body);
      const company = await storage.updateOverseasCompany(id, data, organizationId);
      if (!company) {
        return res.status(404).json({ message: "Overseas company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas company data", error });
    }
  });

  app.patch("/api/overseas-companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const data = insertOverseasCompanySchema.partial().parse(req.body);
      const company = await storage.updateOverseasCompany(id, data, organizationId);
      if (!company) {
        return res.status(404).json({ message: "Overseas company not found" });
      }
      res.json(company);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas company data", error });
    }
  });

  app.delete("/api/overseas-companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      
      const company = await storage.getOverseasCompany(id, organizationId);
      if (!company) {
        return res.status(404).json({ message: "Overseas company not found" });
      }
      
      const deleted = await storage.deleteOverseasCompany(id, organizationId);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete overseas company" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting overseas company:', error);
      res.status(500).json({ 
        message: "Failed to delete overseas company", 
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
    const organizationId = await extractOrganizationId(req);
    const meetings = await storage.getMeetings(organizationId);
    res.json(meetings);
  });

  app.get("/api/meetings/upcoming", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const meetings = await storage.getUpcomingMeetings(organizationId);
    res.json(meetings);
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      console.log('🎯 REAL Meeting API - Headers:', {
        'x-organization-id': req.headers['x-organization-id'],
        'x-organization': req.headers['x-organization'],
        path: req.path
      });
      console.log('🎯 REAL Meeting API - Body:', req.body);
      
      const data = insertMeetingSchema.parse(req.body);
      const organizationId = await extractOrganizationId(req);
      console.log('🎯 REAL Meeting API - Organization ID:', organizationId);
      
      const meeting = await storage.createMeeting(data, organizationId);
      console.log('🎯 REAL Meeting API - Created meeting:', meeting);
      res.status(201).json(meeting);
    } catch (error) {
      console.error('🎯 REAL Meeting API - Error:', error);
      res.status(400).json({ message: "Invalid meeting data", error });
    }
  });

  app.put("/api/meetings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertMeetingSchema.partial().parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.updateMeeting(id, data, organizationId);
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      res.json(meeting);
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
      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.getMeeting(meetingId, organizationId);
      
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
          const organizationId = await extractOrganizationId(req);
          const companies = await storage.getCompanies(organizationId);
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

  // Overseas Funds routes
  app.get("/api/overseas-funds", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const funds = await storage.getOverseasFunds(organizationId);
    res.json(funds);
  });

  app.get("/api/overseas-funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const fund = await storage.getOverseasFund(id, organizationId);
    if (!fund) {
      return res.status(404).json({ message: "Overseas fund not found" });
    }
    res.json(fund);
  });

  app.post("/api/overseas-funds", async (req, res) => {
    try {
      const data = insertOverseasFundSchema.parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const fund = await storage.createOverseasFund(data, organizationId);
      res.status(201).json(fund);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas fund data", error });
    }
  });

  app.put("/api/overseas-funds/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertOverseasFundSchema.parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const fund = await storage.updateOverseasFund(id, data, organizationId);
      if (!fund) {
        return res.status(404).json({ message: "Overseas fund not found" });
      }
      res.json(fund);
    } catch (error) {
      res.status(400).json({ message: "Invalid overseas fund data", error });
    }
  });

  app.delete("/api/overseas-funds/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const success = await storage.deleteOverseasFund(id, organizationId);
    if (!success) {
      return res.status(404).json({ message: "Overseas fund not found" });
    }
    res.status(204).send();
  });

  app.post("/api/overseas-funds/upload-csv", upload.single('file'), async (req, res) => {
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

      console.log('CSV Data Preview:', csvData.slice(0, 2));
      console.log('Available companies:', (await storage.getOverseasCompanies(1)).map(c => c.name));

      // Process each row
      for (const data of csvData) {
        lineNumber++;
        
        try {
          console.log(`Processing line ${lineNumber}:`, data);
          
          // Check which required fields are missing
          const missingFields = [];
          
          const nameValue = data.name || data.Name || data['Fund Name'] || data['fund name'];
          if (!nameValue || nameValue.toString().trim() === '') missingFields.push('name (Fund Name)');
          
          const companyValue = data.company || data.Company || data['Company Name'] || data['company name'];
          if (!companyValue || companyValue.toString().trim() === '') missingFields.push('company (Company)');
          
          const aumFieldValue = data.aum || data.AUM || data['AUM (Billion USD)'] || data['aum (billion usd)'];
          if (!aumFieldValue || aumFieldValue.toString().trim() === '') missingFields.push('aum (AUM)');
          
          const typeValue = data.type || data.Type || data['Fund Type'] || data['fund type'];
          if (!typeValue || typeValue.toString().trim() === '') missingFields.push('type (Type)');
          
          const ownSharesValue = data.ownOurShares || data['Own Our Shares'] || data['own our shares'] || data.ownShares;

          if (missingFields.length > 0) {
            console.log(`Line ${lineNumber} missing fields:`, missingFields);
            errors.push(`줄 ${lineNumber}: 필수 필드 누락: ${missingFields.join(', ')}`);
            continue;
          }

          const finalName = nameValue.toString().trim();
          const finalCompanyName = companyValue.toString().trim();
          const finalType = typeValue.toString().trim();
          const finalAum = aumFieldValue.toString().trim();
          const finalOwnShares = ownSharesValue ? (ownSharesValue.toString().toLowerCase() === 'yes' || ownSharesValue.toString().toLowerCase() === 'true') : false;
          const finalShareAmount = (data.shareAmount || data['Share Amount'] || data['share amount'] || "").toString().trim();

          // Find overseas company by name (with flexible matching)
          const organizationId = await extractOrganizationId(req);
          const companies = await storage.getOverseasCompanies(organizationId);
          console.log(`Looking for company: "${finalCompanyName}" in:`, companies.map(c => c.name));
          
          // Try exact match first
          let company = companies.find(c => c.name.toLowerCase() === finalCompanyName.toLowerCase());
          
          // If no exact match, try partial matching
          if (!company) {
            // Check if the CSV company name is contained in any registered company name
            company = companies.find(c => 
              c.name.toLowerCase().includes(finalCompanyName.toLowerCase()) ||
              finalCompanyName.toLowerCase().includes(c.name.toLowerCase())
            );
          }
          
          // Special mappings for common abbreviations
          if (!company) {
            const companyMappings: Record<string, string> = {
              'j.p. morgan am': 'J.P. Morgan Asset Management',
              'jp morgan am': 'J.P. Morgan Asset Management',
              'jpmorgan am': 'J.P. Morgan Asset Management',
              'blackrock': 'BlackRock',
              'fidelity': 'Fidelity International',
              'abrdn': 'Abrdn'
            };
            
            const mappedName = companyMappings[finalCompanyName.toLowerCase()];
            if (mappedName) {
              company = companies.find(c => c.name === mappedName);
            }
          }
          
          if (!company) {
            errors.push(`줄 ${lineNumber}: 해외 운용사 "${finalCompanyName}"를 찾을 수 없습니다. 등록된 운용사: ${companies.map(c => c.name).join(', ')}`);
            continue;
          }

          // Validate and normalize fund type
          const validTypes = ['Value', 'Growth', 'GARP', 'Index', 'Other'];
          let normalizedType = finalType;
          
          // Try to map common type variations to our standard types
          if (!validTypes.includes(finalType)) {
            const typeLower = finalType.toLowerCase();
            if (typeLower.includes('value')) {
              normalizedType = 'Value';
            } else if (typeLower.includes('growth')) {
              normalizedType = 'Growth';
            } else if (typeLower.includes('garp')) {
              normalizedType = 'GARP';
            } else if (typeLower.includes('index') || typeLower.includes('passive')) {
              normalizedType = 'Index';
            } else {
              normalizedType = 'Other';
            }
          }
          
          console.log(`Type mapping: "${finalType}" -> "${normalizedType}"`);

          const fundData = {
            organizationId,
            name: finalName,
            companyId: company.id,
            aum: finalAum,
            type: normalizedType,
            ownOurShares: finalOwnShares,
            shareAmount: finalOwnShares ? finalShareAmount : null
          };

          results.push(fundData);

        } catch (err) {
          console.error('Error processing row:', err);
          errors.push(`Line ${lineNumber}: Failed to process row - ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      // Return errors if any
      if (errors.length > 0) {
        return res.status(400).json({ 
          message: "CSV validation failed", 
          errors: errors.slice(0, 10), // Limit to first 10 errors
          totalErrors: errors.length
        });
      }

      // Create all funds
      const createdFunds = [];
      for (const fundData of results) {
        const fund = await storage.createOverseasFund(fundData, fundData.organizationId);
        createdFunds.push(fund);
      }

      res.status(201).json({ 
        message: `Successfully imported ${createdFunds.length} overseas funds`,
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
    const organizationId = await extractOrganizationId(req);
    const meetings = await storage.getMeetings(organizationId);
    res.json(meetings);
  });

  app.get("/api/meetings/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const meeting = await storage.getMeeting(id, organizationId);
    if (meeting) {
      res.json(meeting);
    } else {
      res.status(404).json({ message: "Meeting not found" });
    }
  });

  app.get("/api/meetings/investor/:investorId", async (req, res) => {
    const investorId = parseInt(req.params.investorId);
    const organizationId = await extractOrganizationId(req);
    const meetings = await storage.getMeetingsByInvestor(investorId, organizationId);
    res.json(meetings);
  });

  app.post("/api/meetings", async (req, res) => {
    try {
      console.log('📝 Creating meeting - Headers:', {
        'x-organization-id': req.headers['x-organization-id'],
        'x-organization': req.headers['x-organization'],
        path: req.path
      });
      console.log('📝 Raw request body:', req.body);
      
      // Skip validation for now and directly create
      const data = { ...req.body };
      console.log('📝 Data to process:', data);
      
      const organizationId = await extractOrganizationId(req);
      console.log('📝 Final organization ID for meeting:', organizationId);
      
      const meeting = await storage.createMeeting(data, organizationId);
      console.log('📝 Meeting created:', meeting);
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
      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.updateMeeting(id, data, organizationId);
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
    const organizationId = await extractOrganizationId(req);
    const success = await storage.deleteMeeting(id, organizationId);
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
      const organizationId = await extractOrganizationId(req);
      const updatedMeeting = await storage.updateMeeting(meetingId, minutesData, organizationId);
      console.log("Update result:", updatedMeeting);
      
      if (!updatedMeeting) {
        console.error("Meeting not found:", meetingId);
        return res.status(404).json({ message: "Meeting not found" });
      }

      // Also add to Documents table with "Meeting Notes" category
      try {
        const organizationId = await extractOrganizationId(req);
        const meeting = await storage.getMeeting(meetingId, organizationId);
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

      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.updateMeeting(meetingId, updateData, organizationId);
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

  // Other Events routes
  app.get("/api/other-events", async (req, res) => {
    const events = await storage.getOtherEvents();
    res.json(events);
  });

  app.get("/api/other-events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const event = await storage.getOtherEvent(id);
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }
    res.json(event);
  });

  app.post("/api/other-events", async (req, res) => {
    try {
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      const data = insertOtherEventSchema.parse(requestData);
      const event = await storage.createOtherEvent(data);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ message: "Invalid event data", error });
    }
  });

  app.patch("/api/other-events/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const requestData = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined
      };
      const data = insertOtherEventSchema.partial().parse(requestData);
      const event = await storage.updateOtherEvent(id, data);
      if (event) {
        res.json(event);
      } else {
        res.status(404).json({ message: "Event not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid event data", error });
    }
  });

  app.delete("/api/other-events/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteOtherEvent(id);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Event not found" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const investors = await storage.getInvestors(organizationId);
    const investments = await storage.getInvestments();
    const meetings = await storage.getMeetings(organizationId);
    const upcomingMeetings = await storage.getUpcomingMeetings(organizationId);

    const companies = await storage.getCompanies(organizationId);
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
      const organizationId = await extractOrganizationId(req);
      const allInvestors = await storage.getInvestors(organizationId);
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
    const organizationId = await extractOrganizationId(req);
    const analysts = await storage.getAnalysts(organizationId);
    res.json(analysts);
  });

  app.get("/api/analysts/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const analyst = await storage.getAnalyst(id, organizationId);
    if (!analyst) {
      return res.status(404).json({ error: "Analyst not found" });
    }
    res.json(analyst);
  });

  app.post("/api/analysts", async (req, res) => {
    try {
      const analystData = insertAnalystSchema.parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const analyst = await storage.createAnalyst(analystData, organizationId);
      res.status(201).json(analyst);
    } catch (error) {
      res.status(400).json({ error: "Invalid analyst data", details: error });
    }
  });

  app.patch("/api/analysts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updateData = insertAnalystSchema.partial().parse(req.body);
      const organizationId = await extractOrganizationId(req);
      const analyst = await storage.updateAnalyst(id, updateData, organizationId);
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
    const organizationId = await extractOrganizationId(req);
    const success = await storage.deleteAnalyst(id, organizationId);
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

          const organizationId = await extractOrganizationId(req);
          const createdAnalyst = await storage.createAnalyst(analystData, organizationId);
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

      // Validate file type (PDF, DOC, DOCX, HWP, Excel, CSV, etc.)
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'application/x-hwp',
        'application/haansofthwp',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({ 
          error: "Invalid file type. Allowed types: PDF, DOC, DOCX, TXT, JPEG, PNG, HWP, Excel, CSV" 
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
      const { subject, content, recipients, attachments, uploadedFiles } = req.body;
      
      // Get recipient emails
      const investorEmails: string[] = [];
      const analystEmails: string[] = [];
      
      if (recipients.investors && recipients.investors.length > 0) {
        for (const investorId of recipients.investors) {
          const organizationId = await extractOrganizationId(req);
          const investor = await storage.getInvestor(investorId, organizationId);
          if (investor && investor.email) {
            investorEmails.push(investor.email);
          }
        }
      }
      
      if (recipients.analysts && recipients.analysts.length > 0) {
        for (const analystId of recipients.analysts) {
          const organizationId = await extractOrganizationId(req);
          const analyst = await storage.getAnalyst(analystId, organizationId);
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
      
      // Add database documents
      if (attachments && attachments.length > 0) {
        for (const docId of attachments) {
          const document = await storage.getDocument(docId);
          if (document) {
            attachmentFiles.push({
              filename: document.originalName,
              path: document.filePath,
              contentType: document.fileType,
              source: 'database'
            });
          }
        }
      }
      
      // Add uploaded files from PC
      if (uploadedFiles && uploadedFiles.length > 0) {
        for (const file of uploadedFiles) {
          attachmentFiles.push({
            filename: file.name,
            url: file.url,
            contentType: 'application/octet-stream',
            source: 'upload'
          });
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
          
          // Log the email
          const emailLog = await storage.createEmailLog({
            recipientEmail: email,
            recipientName: email,
            recipientType: 'investor',
            subject: subject,
            content: content,
            status: success ? 'sent' : 'failed'
          });
          
          results.push({ email, success, emailLogId: emailLog.id });
        } catch (error) {
          console.error(`Failed to send email to ${email}:`, error);
          
          // Log failed email
          try {
            const emailLog = await storage.createEmailLog({
              recipientEmail: email,
              recipientName: email,
              recipientType: 'investor', 
              subject: subject,
              content: content,
              status: 'failed'
            });
            results.push({ email, success: false, error: error instanceof Error ? error.message : 'Unknown error', emailLogId: emailLog.id });
          } catch (logError) {
            console.error('Failed to log email:', logError);
            results.push({ email, success: false, error: error instanceof Error ? error.message : 'Unknown error' });
          }
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

      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.updateMeeting(id, updateData, organizationId);
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
      const organizationId = await extractOrganizationId(req);
      const meeting = await storage.getMeeting(id, organizationId);
      
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

  // Email Logs routes
  app.get("/api/email-logs", async (req, res) => {
    try {
      const emailLogs = await storage.getEmailLogs();
      res.json(emailLogs);
    } catch (error) {
      console.error('Get email logs error:', error);
      res.status(500).json({ error: "Failed to fetch email logs" });
    }
  });

  app.get("/api/email-logs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const emailLog = await storage.getEmailLog(id);
      if (!emailLog) {
        return res.status(404).json({ message: "Email log not found" });
      }
      res.json(emailLog);
    } catch (error) {
      console.error('Get email log error:', error);
      res.status(500).json({ error: "Failed to fetch email log" });
    }
  });

  app.get("/api/email-logs/recipient/:email", async (req, res) => {
    try {
      const email = req.params.email;
      const emailLogs = await storage.getEmailLogsByRecipient(email);
      res.json(emailLogs);
    } catch (error) {
      console.error('Get email logs by recipient error:', error);
      res.status(500).json({ error: "Failed to fetch email logs for recipient" });
    }
  });

  app.post("/api/email-logs", async (req, res) => {
    try {
      const emailLogData = insertEmailLogSchema.parse(req.body);
      const emailLog = await storage.createEmailLog(emailLogData);
      res.status(201).json(emailLog);
    } catch (error) {
      res.status(400).json({ error: "Invalid email log data", details: error });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const users = await storage.getUsers(organizationId);
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const user = await storage.getUser(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      const user = await storage.createUser(data);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const data = insertUserSchema.partial().parse(req.body);
      const user = await storage.updateUser(id, data);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(400).json({ message: "Invalid user data", error });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteUser(id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      res.status(500).json({ 
        message: "Failed to delete user", 
        error: error.message 
      });
    }
  });

  // Investor Insights routes
  app.get("/api/investor-insights", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const insights = await storage.getInvestorInsights(organizationId);
    res.json(insights);
  });

  app.post("/api/investor-insights/generate", async (req, res) => {
    try {
      const { startDate, endDate } = req.body;
      const organizationId = await extractOrganizationId(req);
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "주간 시작일과 종료일이 필요합니다." });
      }

      // Get meetings for the week
      const meetings = await storage.getMeetingsForWeek(startDate, endDate, organizationId);
      const documents = await storage.getDocuments(); // TODO: Filter by date range if needed
      const investors = await storage.getInvestors(organizationId); // 투자자 정보 가져오기
      
      // Analyze with AI
      const analysis = await aiService.analyzeWeeklyMeetings({
        meetings,
        documents: documents.filter(doc => 
          doc.createdAt && doc.createdAt >= new Date(startDate) && doc.createdAt <= new Date(endDate)
        ),
        investors
      });

      // Create insight record
      const insightData = {
        organizationId,
        weekStartDate: startDate,
        weekEndDate: endDate,
        commonInterests: analysis.commonInterests,
        positiveFeedback: analysis.positiveFeedback,
        concerns: analysis.concerns,
        followUpRecommendations: analysis.followUpRecommendations,
        meetingCount: meetings.length,
        meetingSummary: analysis.meetingSummary,
        status: 'completed' as const
      };

      const insight = await storage.createInvestorInsight(insightData, organizationId);
      res.status(201).json(insight);
    } catch (error: any) {
      console.error('AI 분석 오류:', error);
      res.status(500).json({ 
        message: "AI 분석 중 오류가 발생했습니다.", 
        error: error.message 
      });
    }
  });

  app.get("/api/investor-insights/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID parameter" });
      }
      const organizationId = await extractOrganizationId(req);
      const insight = await storage.getInvestorInsight(id, organizationId);
      if (!insight) {
        return res.status(404).json({ message: "Investor insight not found" });
      }
      res.json(insight);
    } catch (error: any) {
      console.error('Error fetching investor insight:', error);
      res.status(500).json({ 
        message: "Failed to fetch investor insight", 
        error: error.message 
      });
    }
  });

  app.delete("/api/investor-insights/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid ID parameter" });
      }
      const organizationId = await extractOrganizationId(req);
      const deleted = await storage.deleteInvestorInsight(id, organizationId);
      if (!deleted) {
        return res.status(404).json({ message: "Investor insight not found" });
      }
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting investor insight:', error);
      res.status(500).json({ 
        message: "Failed to delete investor insight", 
        error: error.message 
      });
    }
  });

  // Expected Questions API endpoint
  app.post("/api/investor-insights/expected-questions", async (req, res) => {
    try {
      const organizationId = await extractOrganizationId(req);
      
      // Get meetings from the last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const today = new Date();
      
      const startDate = thirtyDaysAgo.toISOString().split('T')[0];
      const endDate = today.toISOString().split('T')[0];

      // Get meetings for the last 30 days
      const meetings = await storage.getMeetingsForPeriod(startDate, endDate, organizationId);
      const documents = await storage.getDocuments(); // TODO: Filter by date range if needed
      const investors = await storage.getInvestors(organizationId);
      
      console.log(`Found ${meetings.length} meetings in the last 30 days (${startDate} to ${endDate})`);
      console.log('Meeting dates:', meetings.map(m => m.scheduledDate).slice(0, 5));
      
      // Generate expected questions with AI
      const analysis = await aiService.generateExpectedQuestions({
        meetings,
        documents: documents.filter(doc => 
          doc.createdAt && doc.createdAt >= thirtyDaysAgo && doc.createdAt <= today
        ),
        investors
      });

      res.json(analysis);
    } catch (error: any) {
      console.error('예상질문 생성 오류:', error);
      res.status(500).json({ 
        message: "예상질문 생성 중 오류가 발생했습니다.", 
        error: error.message 
      });
    }
  });

  app.post("/api/investor-insights/expected-questions/export", async (req, res) => {
    try {
      const { format, startDate, endDate } = req.body;
      const organizationId = await extractOrganizationId(req);
      
      if (!startDate || !endDate) {
        return res.status(400).json({ message: "시작일과 종료일이 필요합니다." });
      }

      if (!format || !['pdf', 'doc'].includes(format)) {
        return res.status(400).json({ message: "유효한 형식을 선택해주세요. (pdf 또는 doc)" });
      }

      // Get meetings data for the period
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      const periodStartDate = thirtyDaysAgo.toISOString().split('T')[0];
      const periodEndDate = today.toISOString().split('T')[0];

      const meetings = await storage.getMeetingsForPeriod(periodStartDate, periodEndDate, organizationId);
      const documents = await storage.getDocuments();
      const investors = await storage.getInvestors(organizationId);
      
      // Generate expected questions with AI
      const analysis = await aiService.generateExpectedQuestions({
        meetings,
        documents: documents.filter(doc => 
          doc.createdAt && doc.createdAt >= thirtyDaysAgo && doc.createdAt <= today
        ),
        investors
      });

      res.json({
        ...analysis,
        reportMeta: {
          period: `${startDate} ~ ${endDate}`,
          meetingCount: meetings.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error: any) {
      console.error('예상질문 보고서 생성 오류:', error);
      res.status(500).json({ 
        message: "예상질문 보고서 생성 중 오류가 발생했습니다.", 
        error: error.message 
      });
    }
  });

  // Analyst Reports routes
  app.get("/api/analyst-reports", async (req, res) => {
    const organizationId = await extractOrganizationId(req);
    const reports = await storage.getAnalystReports(organizationId);
    res.json(reports);
  });

  app.get("/api/analyst-reports/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const report = await storage.getAnalystReport(id, organizationId);
    if (!report) {
      return res.status(404).json({ message: "Analyst report not found" });
    }
    res.json(report);
  });

  app.post("/api/analyst-reports", async (req, res) => {
    try {
      const organizationId = await extractOrganizationId(req);
      const data = insertAnalystReportSchema.parse(req.body);
      const report = await storage.createAnalystReport(data, organizationId);
      res.status(201).json(report);
    } catch (error) {
      res.status(400).json({ message: "Invalid analyst report data", error });
    }
  });

  app.patch("/api/analyst-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      const data = insertAnalystReportSchema.partial().parse(req.body);
      const report = await storage.updateAnalystReport(id, data, organizationId);
      if (report) {
        res.json(report);
      } else {
        res.status(404).json({ message: "Analyst report not found" });
      }
    } catch (error) {
      res.status(400).json({ message: "Invalid analyst report data", error });
    }
  });

  app.delete("/api/analyst-reports/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const organizationId = await extractOrganizationId(req);
    const success = await storage.deleteAnalystReport(id, organizationId);
    if (success) {
      res.status(204).send();
    } else {
      res.status(404).json({ message: "Analyst report not found" });
    }
  });

  // Analyst Report AI Analysis routes
  app.get("/api/analyst-reports/:id/analysis", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const analysis = await storage.getAnalystReportAnalysis(reportId);
      if (analysis) {
        res.json(analysis);
      } else {
        res.status(404).json({ message: "Analysis not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to get analysis", error });
    }
  });

  app.post("/api/analyst-reports/:id/analyze", async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const organizationId = await extractOrganizationId(req);
      
      // Get the report details
      const report = await storage.getAnalystReport(reportId, organizationId);
      if (!report) {
        return res.status(404).json({ message: "Analyst report not found" });
      }

      // Check if analysis already exists
      let analysis = await storage.getAnalystReportAnalysis(reportId);
      if (!analysis) {
        // Create analysis record with 'analyzing' status
        analysis = await storage.createAnalystReportAnalysis({
          reportId,
          positivePoints: "",
          concerns: "",
          averageTargetPrice: "",
          analysisStatus: "analyzing"
        });
      } else {
        // Update existing analysis to analyzing status
        analysis = await storage.updateAnalystReportAnalysis(reportId, {
          analysisStatus: "analyzing"
        });
      }

      // Perform AI analysis immediately and synchronously for testing
      try {
        console.log("=== 서버 측 분석 시작 ===");
        console.log("Report ID:", reportId);
        console.log("Report object:", JSON.stringify(report, null, 2));
        console.log("File path from report:", report.filePath);
        console.log("Report title:", report.title);
        
        const aiService = new AIAnalysisService();
        const result = await aiService.analyzeReport(report.filePath || "", report.title || "");
        console.log("AI analysis completed, updating database...");
        
        const updatedAnalysis = await storage.updateAnalystReportAnalysis(reportId, {
          positivePoints: result.positivePoints,
          concerns: result.concerns,
          averageTargetPrice: result.averageTargetPrice,
          analysisStatus: "completed"
        });
        
        console.log("Database updated successfully");
        res.json(updatedAnalysis);
      } catch (error) {
        console.error("AI analysis failed:", error);
        try {
          const failedAnalysis = await storage.updateAnalystReportAnalysis(reportId, {
            analysisStatus: "failed"
          });
          res.json(failedAnalysis);
        } catch (updateError) {
          console.error("Failed to update analysis status to failed:", updateError);
          res.json(analysis);
        }
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to start analysis", error });
    }
  });

  // Comprehensive analysis route
  app.post("/api/comprehensive-analysis", async (req, res) => {
    try {
      const { reportIds } = req.body;
      if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
        return res.status(400).json({ error: "분석할 리포트 ID 목록이 필요합니다" });
      }

      console.log(`종합 분석 요청: ${reportIds.length}개 리포트`);

      // Get all reports with manual input data
      const analysisResults = [];
      const organizationId = await extractOrganizationId(req);
      
      for (const reportId of reportIds) {
        const report = await storage.getAnalystReport(reportId, organizationId);
        if (!report) {
          continue;
        }

        // Use manual input data instead of AI analysis results
        if (report.contentText || report.description || report.targetPrice) {
          analysisResults.push({
            positivePoints: report.contentText || "",
            concerns: report.description || "",
            averageTargetPrice: report.targetPrice || "",
            reportTitle: report.title || "Untitled Report"
          });
        }
      }

      if (analysisResults.length === 0) {
        return res.status(400).json({ error: "분석할 수 있는 리포트가 없습니다. 리포트에 긍정적 요인, 우려사항 또는 목표주가 중 하나 이상이 입력되어야 합니다." });
      }

      // Perform comprehensive analysis
      const aiService = new AIAnalysisService();
      const comprehensiveResult = await aiService.comprehensiveAnalysis(analysisResults);

      res.json(comprehensiveResult);
    } catch (error) {
      console.error("종합 분석 오류:", error);
      res.status(500).json({ error: "종합 분석에 실패했습니다" });
    }
  });

  // Admin routes
  app.get("/api/organizations", async (req, res) => {
    try {
      const organizations = await storage.getAllOrganizations();
      res.json(organizations);
    } catch (error) {
      res.status(500).json({ message: "Failed to get organizations", error });
    }
  });

  app.post("/api/organizations", async (req, res) => {
    try {
      const { name, domain, subscriptionTier } = req.body;
      const organization = await storage.createOrganization({
        name,
        domain,
        subscriptionTier: subscriptionTier || 'starter',
        settings: {},
        isActive: true
      });
      
      // 새 조직 생성 시 도메인 매핑 캐시 초기화
      clearDomainMappingCache();
      
      res.status(201).json(organization);
    } catch (error) {
      res.status(400).json({ message: "Failed to create organization", error });
    }
  });

  app.delete("/api/organizations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // 기본 조직(ID=1)은 삭제 불가
      if (id === 1) {
        return res.status(403).json({ message: "기본 조직은 삭제할 수 없습니다." });
      }
      
      // 조직이 존재하는지 확인
      const organization = await storage.getOrganization(id);
      if (!organization) {
        return res.status(404).json({ message: "조직을 찾을 수 없습니다." });
      }
      
      // 조직 삭제 (연관된 데이터도 함께 삭제)
      const deleted = await storage.deleteOrganization(id);
      if (!deleted) {
        return res.status(500).json({ message: "조직 삭제에 실패했습니다." });
      }
      
      // 조직 삭제 시 도메인 매핑 캐시 초기화
      clearDomainMappingCache();
      
      res.status(204).send();
    } catch (error: any) {
      console.error('Error deleting organization:', error);
      res.status(500).json({ 
        message: "조직 삭제 중 오류가 발생했습니다.", 
        error: error.message 
      });
    }
  });

  app.get("/api/admin/stats", async (req, res) => {
    try {
      const stats = await storage.getDatabaseStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to get database stats", error });
    }
  });

  app.get("/api/admin/export/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const data = await storage.exportOrganizationData(organizationId);
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="organization_${organizationId}_data.json"`);
      res.json(data);
    } catch (error) {
      console.error('Error exporting organization data:', error);
      res.status(500).json({ message: "Failed to export organization data", error });
    }
  });

  app.get("/api/admin/export-all", async (req, res) => {
    try {
      const data = await storage.exportAllData();
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="all_organizations_data.json"');
      res.json(data);
    } catch (error) {
      console.error('Error exporting all data:', error);
      res.status(500).json({ message: "Failed to export all data", error });
    }
  });

  app.get("/api/admin/export-companies-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const companies = await storage.getCompanies(organizationId);
      
      // Convert to CSV format
      const csvHeaders = [
        'ID', '회사명', '업종', '시가총액', '웹사이트', '설명', '생성일'
      ];
      
      const csvRows = companies.map(company => [
        company.id,
        `"${company.name || ''}"`,
        `"${company.industry || ''}"`,
        company.marketCap || '',
        `"${company.website || ''}"`,
        `"${company.description || ''}"`,
        company.createdAt ? new Date(company.createdAt).toLocaleDateString('ko-KR') : ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="companies_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent); // Add BOM for Korean characters
    } catch (error) {
      console.error('Error exporting companies CSV:', error);
      res.status(500).json({ message: "Failed to export companies CSV", error });
    }
  });

  app.get("/api/admin/export-investors-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const investors = await storage.getInvestors(organizationId);
      
      const csvHeaders = [
        'ID', '이름', '이메일', '전화번호', '회사', '펀드', '직책', '전문분야', '국가', '언어'
      ];
      
      const csvRows = investors.map(investor => [
        investor.id,
        `"${investor.name || ''}"`,
        `"${investor.email || ''}"`,
        `"${investor.phone || ''}"`,
        `"${investor.company || ''}"`,
        `"${investor.fund || ''}"`,
        `"${investor.position || ''}"`,
        `"${Array.isArray(investor.specialty) ? investor.specialty.join('; ') : (investor.specialty || '')}"`,
        `"${investor.country || ''}"`,
        `"${investor.language || ''}"`
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="investors_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting investors CSV:', error);
      res.status(500).json({ message: "Failed to export investors CSV", error });
    }
  });

  app.get("/api/admin/export-analysts-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const analysts = await storage.getAnalysts(organizationId);
      
      const csvHeaders = [
        'ID', '이름', '이메일', '전화번호', '회사', '직책', '담당산업', 'Coverage 여부'
      ];
      
      const csvRows = analysts.map(analyst => [
        analyst.id,
        `"${analyst.name || ''}"`,
        `"${analyst.email || ''}"`,
        `"${analyst.phone || ''}"`,
        `"${analyst.company || ''}"`,
        `"${analyst.position || ''}"`,
        `"${Array.isArray(analyst.specialization) ? analyst.specialization.join('; ') : (analyst.specialization || '')}"`,
        `"${analyst.status || 'No'}"`
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="analysts_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting analysts CSV:', error);
      res.status(500).json({ message: "Failed to export analysts CSV", error });
    }
  });

  app.get("/api/admin/export-meetings-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const meetings = await storage.getMeetings(organizationId);
      
      const csvHeaders = [
        'ID', '제목', '참석자 유형', '예정일시', '장소', '상태', '카테고리', '설명'
      ];
      
      const csvRows = meetings.map(meeting => [
        meeting.id,
        `"${meeting.title || ''}"`,
        `"${meeting.attendeeType || ''}"`,
        meeting.scheduledDate ? new Date(meeting.scheduledDate).toLocaleString('ko-KR') : '',
        `"${meeting.location || ''}"`,
        `"${meeting.status || ''}"`,
        `"${meeting.meetingCategory || ''}"`,
        `"${meeting.description || ''}"`
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="meetings_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting meetings CSV:', error);
      res.status(500).json({ message: "Failed to export meetings CSV", error });
    }
  });

  app.get("/api/admin/export-users-csv", async (req, res) => {
    try {
      const users = await storage.getUsers();
      
      const csvHeaders = [
        'ID', '이름', '이메일', '조직ID', '생성일'
      ];
      
      const csvRows = users.map(user => [
        user.id,
        `"${user.name || ''}"`,
        `"${user.email || ''}"`,
        user.organizationId || '',
        user.createdAt ? new Date(user.createdAt).toLocaleDateString('ko-KR') : ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="users.csv"');
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting users CSV:', error);
      res.status(500).json({ message: "Failed to export users CSV", error });
    }
  });

  app.get("/api/admin/export-overseas-investors-csv", async (req, res) => {
    try {
      const investors = await storage.getOverseasInvestors();
      
      const csvHeaders = [
        'ID', '이름', '이메일', '전화번호', '회사', '펀드', '직책', '전문분야', '국가', '언어'
      ];
      
      const csvRows = investors.map(investor => [
        investor.id,
        `"${investor.name || ''}"`,
        `"${investor.email || ''}"`,
        `"${investor.phone || ''}"`,
        `"${investor.company || ''}"`,
        `"${investor.fund || ''}"`,
        `"${investor.position || ''}"`,
        `"${Array.isArray(investor.specialty) ? investor.specialty.join('; ') : (investor.specialty || '')}"`,
        `"${investor.country || ''}"`,
        `"${investor.language || ''}"`
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="overseas_investors.csv"');
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting overseas investors CSV:', error);
      res.status(500).json({ message: "Failed to export overseas investors CSV", error });
    }
  });

  app.get("/api/admin/export-funds-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const funds = await storage.getFunds(organizationId);
      
      const csvHeaders = [
        'ID', '펀드명', '자산운용사', '펀드 유형', '운용규모', '설명', '생성일'
      ];
      
      const csvRows = funds.map(fund => [
        fund.id,
        `"${fund.name || ''}"`,
        `"${fund.managementCompany || ''}"`,
        `"${fund.fundType || ''}"`,
        fund.aum || '',
        `"${fund.description || ''}"`,
        fund.createdAt ? new Date(fund.createdAt).toLocaleDateString('ko-KR') : ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="funds_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting funds CSV:', error);
      res.status(500).json({ message: "Failed to export funds CSV", error });
    }
  });

  app.get("/api/admin/export-overseas-funds-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const funds = await storage.getOverseasFunds(organizationId);
      
      const csvHeaders = [
        'ID', '펀드명', '자산운용사', '펀드 유형', '운용규모', '국가', '설명', '생성일'
      ];
      
      const csvRows = funds.map(fund => [
        fund.id,
        `"${fund.name || ''}"`,
        `"${fund.managementCompany || ''}"`,
        `"${fund.fundType || ''}"`,
        fund.aum || '',
        `"${fund.country || ''}"`,
        `"${fund.description || ''}"`,
        fund.createdAt ? new Date(fund.createdAt).toLocaleDateString('ko-KR') : ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="overseas_funds_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting overseas funds CSV:', error);
      res.status(500).json({ message: "Failed to export overseas funds CSV", error });
    }
  });

  app.get("/api/admin/export-securities-firms-csv/:organizationId", async (req, res) => {
    try {
      const organizationId = parseInt(req.params.organizationId);
      if (isNaN(organizationId)) {
        return res.status(400).json({ message: "Invalid organization ID" });
      }

      const firms = await storage.getSecuritiesFirms(organizationId);
      
      const csvHeaders = [
        'ID', '증권사명', '업종', '시가총액', '웹사이트', '설명', '생성일'
      ];
      
      const csvRows = firms.map(firm => [
        firm.id,
        `"${firm.name || ''}"`,
        `"${firm.industry || ''}"`,
        firm.marketCap || '',
        `"${firm.website || ''}"`,
        `"${firm.description || ''}"`,
        firm.createdAt ? new Date(firm.createdAt).toLocaleDateString('ko-KR') : ''
      ]);
      
      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.join(','))
      ].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="securities_firms_org_${organizationId}.csv"`);
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error('Error exporting securities firms CSV:', error);
      res.status(500).json({ message: "Failed to export securities firms CSV", error });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
