import express from 'express';
import { storage } from './storage.js';
import { ObjectStorageService } from './objectStorage.js';
import { AIAnalysisService } from './aiAnalysisService.js';
import { insertAnalystSchema, insertAnalystReportSchema } from '../shared/schema.js';

export function createServer() {
  const app = express();
  app.use(express.json());
  
  const objectStorageService = new ObjectStorageService();

  // CORS middleware for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Object upload endpoint
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const { filename } = req.body;
      if (!filename) {
        return res.status(400).json({ error: "Filename is required" });
      }

      const result = await objectStorageService.generateUploadUrl(filename);
      res.json(result);
    } catch (error) {
      console.error("Upload URL generation error:", error);
      res.status(500).json({ error: "Failed to generate upload URL" });
    }
  });

  // Analysts endpoints
  app.get("/api/analysts", async (req, res) => {
    try {
      const organizationId = 1; // TODO: Extract from auth context
      const analysts = await storage.getAnalysts(organizationId);
      res.json(analysts);
    } catch (error) {
      console.error("Failed to fetch analysts:", error);
      res.status(500).json({ error: "Failed to fetch analysts" });
    }
  });

  app.post("/api/analysts", async (req, res) => {
    try {
      const organizationId = 1; // TODO: Extract from auth context
      const validatedData = insertAnalystSchema.parse({
        ...req.body,
        organizationId
      });
      
      const analyst = await storage.createAnalyst(validatedData);
      res.status(201).json(analyst);
    } catch (error) {
      console.error("Failed to create analyst:", error);
      res.status(500).json({ error: "Failed to create analyst" });
    }
  });

  app.patch("/api/analysts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = 1; // TODO: Extract from auth context
      const validatedData = insertAnalystSchema.partial().parse(req.body);
      
      const analyst = await storage.updateAnalyst(id, organizationId, validatedData);
      if (!analyst) {
        return res.status(404).json({ error: "Analyst not found" });
      }
      res.json(analyst);
    } catch (error) {
      console.error("Failed to update analyst:", error);
      res.status(500).json({ error: "Failed to update analyst" });
    }
  });

  app.delete("/api/analysts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = 1; // TODO: Extract from auth context
      
      const success = await storage.deleteAnalyst(id, organizationId);
      if (!success) {
        return res.status(404).json({ error: "Analyst not found" });
      }
      res.json({ message: "Analyst deleted successfully" });
    } catch (error) {
      console.error("Failed to delete analyst:", error);
      res.status(500).json({ error: "Failed to delete analyst" });
    }
  });

  // Analyst Reports endpoints
  app.get("/api/analyst-reports", async (req, res) => {
    try {
      const organizationId = 1; // TODO: Extract from auth context
      const reports = await storage.getAnalystReports(organizationId);
      res.json(reports);
    } catch (error) {
      console.error("Failed to fetch analyst reports:", error);
      res.status(500).json({ error: "Failed to fetch analyst reports" });
    }
  });

  app.post("/api/analyst-reports", async (req, res) => {
    try {
      const organizationId = 1; // TODO: Extract from auth context
      const validatedData = insertAnalystReportSchema.parse({
        ...req.body,
        organizationId
      });
      
      const report = await storage.createAnalystReport(validatedData);
      res.status(201).json(report);
    } catch (error) {
      console.error("Failed to create analyst report:", error);
      res.status(500).json({ error: "Failed to create analyst report" });
    }
  });

  app.patch("/api/analyst-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = 1; // TODO: Extract from auth context
      const validatedData = insertAnalystReportSchema.partial().parse(req.body);
      
      const report = await storage.updateAnalystReport(id, organizationId, validatedData);
      if (!report) {
        return res.status(404).json({ error: "Analyst report not found" });
      }
      res.json(report);
    } catch (error) {
      console.error("Failed to update analyst report:", error);
      res.status(500).json({ error: "Failed to update analyst report" });
    }
  });

  app.delete("/api/analyst-reports/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const organizationId = 1; // TODO: Extract from auth context
      
      const success = await storage.deleteAnalystReport(id, organizationId);
      if (!success) {
        return res.status(404).json({ error: "Analyst report not found" });
      }
      res.json({ message: "Analyst report deleted successfully" });
    } catch (error) {
      console.error("Failed to delete analyst report:", error);
      res.status(500).json({ error: "Failed to delete analyst report" });
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
      const organizationId = 1; // TODO: Extract from auth context
      
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
            reportTitle: report.title
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

  return app;
}