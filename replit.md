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
    - Document management system with cloud file upload (Replit Object Storage), categorization, and search.

    - Dynamic search and filtering capabilities across various data tables.
    - Consolidated investor/analyst information display with meeting history.

### UI/UX Decisions
- Consistent header and sidebar navigation.
- Use of Radix UI and shadcn/ui for accessible and themable components.
- Tailwind CSS for utility-first styling.
- Clear, intuitive layouts for data tables and forms.
- Dashboard focused on meeting management metrics and quick actions.
- Terminology updated to "Buyside" and "Sellside" for market distinction.

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon Database (serverless platform)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Hookform Resolvers
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Email Service**: SendGrid (for email campaigns)
- **File Storage**: Replit Object Storage (cloud file storage for documents and meeting minutes)
- **File Upload**: Uppy.js with AWS S3 plugin (for direct-to-cloud uploads)

### Development Tools
- **Type Safety**: TypeScript
- **Database Migrations**: Drizzle Kit
- **Bundling**: Vite, ESBuild

## File Upload Implementation Details

### Object Storage Architecture
- **Platform**: Replit Object Storage (Google Cloud Storage backend)
- **Bucket Structure**:
  - Default Bucket: `repl-default-bucket-$REPL_ID`
  - Public Directory: `/public` (for static assets)
  - Private Directory: `/.private` (for user uploads)
  - Upload Directory: `/.private/uploads/` (for meeting documents)

### Upload Flow
1. Client requests pre-signed URL from `/api/objects/upload`
2. Server generates unique object ID and returns pre-signed PUT URL
3. Client uploads file directly to Object Storage using Uppy.js
4. On completion, client calls `/api/documents/upload` with file metadata
5. Server normalizes object path and stores document info in database
6. Files are served via `/objects/*` endpoint with proper access control

### Key Components
- **ObjectUploader Component**: React component with Uppy.js modal interface
- **ObjectStorageService**: Server-side service for managing uploads and downloads
- **Document Management**: Database tracking of uploaded files with metadata

### Security Features
- Pre-signed URLs with limited TTL (15 minutes)
- Direct-to-cloud uploads (no server intermediary)
- Proper Content-Type and file size validation
- Object path normalization for security