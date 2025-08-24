# IR CRM - Investor Relations Management System

## Overview
IR CRM is a comprehensive investor relations management system designed to centralize the management of investor contacts, company information, investments, communications, and meetings. The system aims to streamline investor relations activities through a modern full-stack application, providing tools for efficient data management and communication.

## User Preferences
Preferred communication style: Simple, everyday language.
UI Language: Korean only display - use only Korean text for all new features and modifications (changed from bilingual on August 22, 2025).

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
    - **Meeting Minutes Management**: Complete file upload system with Object Storage integration, supporting upload, download, and deletion of meeting documents with real-time UI updates.
    - Document management system with cloud file upload (Replit Object Storage), categorization, and search.
    - Dynamic search and filtering capabilities across various data tables.
    - Consolidated investor/analyst information display with meeting history.

### UI/UX Decisions
- Consistent header and sidebar navigation with categorized sections.
- Use of Radix UI and shadcn/ui for accessible and themable components.
- Tailwind CSS for utility-first styling.
- Clear, intuitive layouts for data tables and forms.
- Dashboard focused on meeting management metrics and quick actions.
- Terminology updated to "Buyside" and "Sellside" for market distinction.
- **Sidebar Navigation Structure**: Organized into logical sections - Main navigation, Event 관리 (NDR/컨퍼런스), Client DB관리 (investor/company data), and Quick Actions.
- **Date Display Fix**: Fixed timezone conversion issues in NDR conferences to show correct dates without UTC offset (Date: 2025-08-21)

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

## Recent Updates (August 2025)

### Meeting Category and Location Fields (August 21, 2025)
- **Meeting Category System**: Added comprehensive 7-type meeting category selection
  - Categories: 내방, Conference Call, 국내CorpDay, 국내NDR, 해외CorpDay, 해외NDR, 기타
  - Integrated into both booking and editing dialogs
- **Location Field**: Added location input field alongside meeting category
  - Side-by-side layout for category and location selection
  - Integrated into database schema and all meeting forms
- **Enhanced Meeting Forms**: Updated both calendar scheduler and meeting management pages
  - Consistent UI layout with Korean/English bilingual labels
  - Proper form validation and data persistence

### Meeting Scheduling and Status Management (August 21, 2025)
- **Past Meeting Recording**: Enabled scheduling system to accept past dates for recording historical meetings
- **Automatic Status Logic**: Implemented intelligent status assignment based on meeting date/time
  - Future meetings: automatically set to "scheduled"  
  - Past meetings: automatically set to "completed"
  - Cancelled meetings: status preserved when already cancelled
- **UI Streamlining**: Removed manual status selection dropdown from Edit Meeting dialog
- **Calendar Enhancements**: Past date slots now clickable with "Past" label, allowing historical meeting entry
- **Button Logic Optimization**: Removed redundant "Record" button, maintained Cancel functionality for scheduled meetings only
- **Korean/English Dialog Headers**: Dynamic dialog titles based on meeting timing (past vs future)

### Document Upload System Improvements (August 20, 2025)
- **Document Upload Redesign**: Completely overhauled document upload system with direct file input approach
- **Schema Simplification**: Removed unnecessary fields (Link to Investor, Link to Company, Tags) from document uploads
- **Upload Stability**: Fixed upload button issues and implemented reliable file upload flow
- **File Size Limits**: Increased upload limits to 50MB across all upload components
- **UI Streamlining**: Simplified upload dialog with only essential fields (Category, Description)

### File Upload System Completed
- **SimpleFileUploader Component**: Replaced unstable Uppy.js system with native HTML file upload for maximum reliability
- **Meeting Minutes Integration**: Complete CRUD operations for meeting documents with real-time UI updates
- **Error Handling**: Comprehensive error handling with graceful degradation for JSON parsing issues
- **Object Storage**: Successfully integrated with Replit Object Storage (bucket ID: replit-objstore-0c0dfa6c-0b7d-43c9-9f94-4143807bd434)
- **UI Improvements**: Immediate state updates for upload/delete operations, eliminating refresh delays

### Sidebar Navigation Restructuring (August 21, 2025)
- **Navigation Categories**: Reorganized sidebar into logical sections for improved user experience
- **Event 관리 Section**: Created new category for event-related features, moved NDR/컨퍼런스 from Meeting 관리 submenu
- **Client DB관리 Section**: Renamed from "DATABASE / DB작성" for clearer purpose identification
- **Menu Simplification**: Removed NDR/컨퍼런스 from Meeting 관리 submenu, keeping only 미팅예약
- **Visual Hierarchy**: Improved sidebar organization with dedicated sections for different functional areas

### Other Events Management System (August 21, 2025)
- **Complete Other Events CRUD**: Built comprehensive event management system for non-NDR/conference events
- **Event Categories**: Added support for 5 event types: Roadshow, Workshop, Conference, Meeting, Other
- **Bilingual Interface**: Korean/English labels throughout with "기타이벤트" / "Other Events" terminology
- **Advanced Features**: Multi-day event support, attendee management with badge UI, status tracking
- **Database Integration**: New `otherEvents` table with full schema and type safety via Drizzle ORM
- **Event Status Logic**: Automatic status determination (Upcoming/Ongoing/Completed) based on dates
- **Search & Filter**: Real-time search across event name, type, location, and organizer fields
- **Navigation Integration**: Added to Event 관리 section in sidebar navigation structure

### Investor Portfolio Management Fields (August 22, 2025)
- **New Portfolio Fields**: Added four new fields to investor profiles for portfolio managers and analysts
  - 총운용경력 (Total Experience) - Years of total portfolio management experience
  - 현회사운용경력 (Current Company Experience) - Years at current company
  - 운용펀드AUM (Managed Fund AUM) - Total assets under management in Million USD
  - 운용펀드수 (Number of Managed Funds) - Count of funds managed
- **Database Schema**: Added new columns to investors table with proper data types (integer, decimal)
- **Form Integration**: Enhanced investor form with Korean-only labels (removed English text for cleaner appearance)
- **Conditional Display**: Fields remain in collapsible R&R section (user initially wanted them always visible but reverted this decision)
- **Detail View**: Updated investor detail view to show portfolio management experience in organized format
- **Data Validation**: Proper number input validation and formatting for experience years and AUM amounts

### Analyst Table and Form Improvements (August 24, 2025)
- **Position Column Removal**: Removed the Position/직책 column from analyst table for cleaner layout
  - Updated table header to remove unnecessary position information
  - Adjusted table colspan from 8 to 7 for proper alignment
  - Streamlined table structure focusing on essential analyst information
- **Phone Number Column Expansion**: Increased phone number column width to 140px for better visibility
  - Enhanced phone number display area for better readability
  - Improved overall table balance and layout
- **Complete Korean Interface**: Achieved 100% Korean-only interface in analyst forms
  - Removed all bilingual labels (English/Korean → Korean only)
  - Updated form validation messages to Korean-only
  - Converted all placeholders to Korean format
  - Changed phone format from "+82-10-1234-5678" to "010-1234-5678"
  - Updated email placeholder to Korean domain (.co.kr)
  - Eliminated English text from dropdown options, buttons, and toast messages
  - Maintained consistency with user preference for Korean-only UI