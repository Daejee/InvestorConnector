# IR CRM - Investor Relations Management System

## Overview
IR CRM is a comprehensive investor relations management system designed to centralize the management of investor contacts, company information, investments, communications, and meetings. The system aims to streamline investor relations activities through a modern full-stack application, providing tools for efficient data management and communication.

## User Preferences
Preferred communication style: Simple, everyday language.
UI Language: Korean/English bilingual display - show both Korean and English text throughout the interface.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **API Pattern**: RESTful API

### Key Components
- **Database Layer**: Drizzle ORM for type-safe schema with Zod validation, managing tables for `investors` (Buyside), `companies` (AMC), `investments`, `communications`, `meetings`, `analysts` (Sellside), `funds`, `ndr/conferences`, and `documents`.
- **API Layer**: Express.js routes with validation, abstract storage interface, centralized error handling.
- **Frontend Components**: Dashboard, Buyside, Sellside, AMC, Funds, Meetings, NDR/Conferences, Communications, Documents pages, comprehensive UI components based on Radix UI, React Hook Form for forms.
- **Data Flow**: Client requests via TanStack Query, processed by Express server, Drizzle ORM for DB operations, responses returned to client, TanStack Query manages state, React components update UI.
- **Key Features**:
    - Complete CRUD operations for Buyside, Sellside, AMC, Funds, Meetings, NDR/Conferences, and Documents.
    - CSV upload functionality for bulk data import (Companies, Buyside, Sellside).
    - Bilingual Korean/English interface across all application components.
    - Comprehensive email system with SendGrid integration for targeted campaigns (region-based or specific person selection).
    - Calendly-style scheduling system with interactive calendar, real-time availability, and meeting conflict prevention.
    - Document management system with file upload, categorization, and search.
    - **Meeting Minutes Upload System**: Individual meeting document upload and management with Object Storage integration.
    - Dynamic search and filtering capabilities across various data tables.
    - Consolidated investor/analyst information display with meeting history.

### UI/UX Decisions
- Consistent header and sidebar navigation.
- Use of Radix UI and shadcn/ui for accessible and themable components.
- Tailwind CSS for utility-first styling.
- Clear, intuitive layouts for data tables and forms.
- Dashboard focused on meeting management metrics and quick actions.
- Terminology updated to "Buyside" and "Sellside" for market distinction.

## Meeting Minutes Upload System

### Architecture
- **Object Storage**: Replit Object Storage with Google Cloud Storage backend
- **File Upload**: Uppy.js with @uppy/aws-s3 for direct-to-storage uploads
- **Database Integration**: Meeting records with minutesFilePath, minutesFileName, minutesFileSize, minutesUploadedAt fields

### Implementation Details
- **Frontend Component**: `client/src/components/ObjectUploader.tsx` - Reusable upload component with modal interface
- **Upload Flow**: 
  1. User clicks "회의록 UPLOAD" button in Edit Meeting dialog
  2. ObjectUploader opens file selection modal with drag-and-drop interface
  3. Client requests presigned upload URL from `/api/objects/upload`
  4. File uploads directly to Object Storage via presigned URL
  5. Client updates meeting record via `/api/meetings/:id/minutes`
- **Server Endpoints**:
  - `POST /api/objects/upload` - Generate presigned upload URL for file uploads
  - `PUT /api/meetings/:id/minutes` - Update meeting with uploaded file information
  - `GET /objects/:objectPath(*)` - Serve private object files for download
- **UI Features**:
  - Upload button in Edit Meeting dialog (meeting-summary.tsx)
  - "회의록 있음" badge for meetings with uploaded minutes
  - "회의록 다운로드" button for direct file access
- **Korean Language Support**: All upload interface elements display Korean/English bilingual text
- **File Management**: 10MB max file size, supports various document formats

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon Database (serverless platform)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Hookform Resolvers
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Email Service**: SendGrid (for email campaigns)
- **File Upload**: Uppy.js with @uppy/aws-s3, ObjectUploader component, Multer (for legacy document uploads)
- **Object Storage**: Google Cloud Storage via Replit Object Storage service

### Development Tools
- **Type Safety**: TypeScript
- **Database Migrations**: Drizzle Kit
- **Bundling**: Vite, ESBuild