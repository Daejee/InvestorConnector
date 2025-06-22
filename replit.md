# IR CRM - Investor Relations Management System

## Overview

IR CRM is a comprehensive investor relations management system built with a modern full-stack architecture. The application provides tools for managing investor contacts, company information, investments, communications, and meetings in a centralized platform.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state
- **UI Framework**: Radix UI primitives with shadcn/ui components
- **Styling**: Tailwind CSS with CSS variables for theming
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **API Pattern**: RESTful API design
- **Development**: Hot module replacement via Vite integration

### Key Components

#### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Type-safe database schema with Zod validation
- **Tables**: 
  - `investors` - Contact information and status
  - `companies` - Investment fund/company details
  - `investments` - Investment records and rounds
  - `communications` - Email, call, and meeting logs
  - `meetings` - Scheduled meeting management

#### API Layer
- **Storage Interface**: Abstract storage layer for data operations
- **Route Handlers**: Express.js routes with validation
- **Error Handling**: Centralized error handling middleware
- **Request Logging**: Automatic API request/response logging

#### Frontend Components
- **Layout System**: Header and sidebar navigation
- **Page Components**: Dashboard, investors, companies, investments, communications
- **Form Components**: React Hook Form with Zod validation
- **UI Components**: Comprehensive component library based on Radix UI

## Data Flow

1. **Client Requests**: Frontend makes API calls using TanStack Query
2. **API Processing**: Express server validates requests and processes data
3. **Database Operations**: Drizzle ORM handles PostgreSQL interactions
4. **Response Handling**: Data returned to client with proper error handling
5. **State Management**: TanStack Query caches and synchronizes server state
6. **UI Updates**: React components re-render based on query state changes

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon Database serverless platform
- **UI Components**: Radix UI primitives for accessible components
- **Styling**: Tailwind CSS for utility-first styling
- **Forms**: React Hook Form with Hookform Resolvers for validation
- **Date Handling**: date-fns for date manipulation
- **Icons**: Lucide React for consistent iconography

### Development Tools
- **TypeScript**: Full type safety across frontend and backend
- **ESBuild**: Fast bundling for production builds
- **Drizzle Kit**: Database migration and schema management
- **Vite Plugins**: Development enhancement and error handling

## Deployment Strategy

### Development Environment
- **Local Development**: `npm run dev` starts both frontend and backend
- **Database**: Drizzle migrations via `npm run db:push`
- **Hot Reload**: Vite provides instant feedback during development

### Production Environment
- **Build Process**: `npm run build` creates optimized bundles
- **Server Bundle**: ESBuild creates Node.js compatible server bundle
- **Static Assets**: Vite builds optimized client-side assets
- **Deployment Target**: Replit autoscale deployment configuration

### Environment Configuration
- **Database URL**: Environment variable for PostgreSQL connection
- **Port Configuration**: Configurable port with external mapping
- **Asset Serving**: Static file serving for production builds

## Changelog
```
Changelog:
- June 18, 2025. Initial setup
- June 18, 2025. Migrated from in-memory storage to PostgreSQL database
- June 18, 2025. Updated company schema to simplified fields (Name, HQ Location, AUM, Type)
- June 18, 2025. Added CSV upload functionality for bulk company import
- June 18, 2025. Added complete CRUD operations for companies (edit, delete, archive)
- June 18, 2025. Enhanced investor form with position types and specialty fields
- June 18, 2025. Added company dropdown integration for investor creation
- June 18, 2025. Added share ownership tracking with conditional amount field
- June 18, 2025. Improved form usability with collapsible sections and better organization
- June 18, 2025. Fixed CSV upload validation with flexible header mapping and robust field detection
- June 18, 2025. Updated sample CSV file with Hong Kong asset management companies data
- June 18, 2025. Enhanced CSV upload UI with clear format examples and requirements
- June 18, 2025. Created complete fund management system with CSV upload functionality
- June 18, 2025. Added fund types: Value, Growth, GARP, Index, Other with color-coded badges
- June 18, 2025. Added major US fund companies for CSV imports (Vanguard, Fidelity, American Funds, PIMCO, T. Rowe Price, Dodge & Cox, Franklin Templeton, J.P. Morgan, MFS, Invesco)
- June 18, 2025. Fixed CSV validation to make "Own Our Shares" and "Share Amount" truly optional fields
- June 18, 2025. Removed "Investments" section from navigation menu and routing per user request
- June 18, 2025. Added fund selection field to investor form, pulling from funds database
- June 18, 2025. Added "N/A" option to "Own Our Share" field alongside Yes/No options
- June 18, 2025. Fixed non-responsive action buttons in investor table (view, edit, delete)
- June 18, 2025. Enhanced investor table to display fund information and N/A ownership status
- June 18, 2025. Implemented complete edit functionality for investors with PATCH API route
- June 18, 2025. Fixed table layout to ensure action buttons are fully visible with proper column spacing
- June 19, 2025. Optimized main layout spacing by reducing left margin from ml-64 to ml-28 for tighter content alignment
- June 19, 2025. Created complete Meetings system with date, investor selection, and place tracking (NDR/Conference, In Office, Other)
- June 19, 2025. Fixed backend API validation for proper date handling in meeting creation and updates
- June 19, 2025. Updated terminology from "Meeting Logs" to "Meetings" throughout navigation and UI components
- June 19, 2025. Implemented full CRUD operations for meetings with proper TypeScript types and form validation
- June 19, 2025. Created complete NDR/Conference database system with fields: event name, start/end dates, place, city, host company, participating companies
- June 19, 2025. Added NDR/Conference API routes with full CRUD operations and proper date handling
- June 19, 2025. Built NDR/Conference frontend with form validation, company management, and status tracking
- June 19, 2025. Added NDR/Conferences to navigation menu with dedicated page and form components
- June 19, 2025. Implemented comprehensive bilingual Korean/English interface throughout entire application
- June 19, 2025. Updated all page headers, navigation items, buttons, search fields, and dialog titles with Korean/English text
- June 19, 2025. Applied bilingual support to Dashboard, Investors, Companies, Funds, Meetings, NDR/Conferences, Communications, Reports, and Documents pages
- June 19, 2025. Enhanced header component with bilingual branding and search functionality
- June 19, 2025. Restructured navigation menu with Funds/펀드 as expandable submenu under Companies/회사
- June 19, 2025. Set Companies/회사 menu to expand by default for better Funds/펀드 accessibility
- June 19, 2025. Created comprehensive email system with SendGrid integration for Earnings Report campaigns
- June 19, 2025. Added regional targeting system - Korean templates for Korean investors, English for overseas investors
- June 19, 2025. Implemented email templates and campaigns database with professional email delivery capabilities
- June 19, 2025. Enhanced Communications page with three-tab interface: Communications Log, Email Templates, Earnings Reports
- June 19, 2025. Moved NDR/Conferences as visible submenu under Meetings/회의 for better navigation organization
- June 19, 2025. Created comprehensive Calendly-style scheduling system with interactive calendar interface
- June 19, 2025. Added weekly calendar view with time slot booking similar to Calendly.com functionality
- June 19, 2025. Implemented real-time availability checking and meeting conflict prevention
- June 19, 2025. Built scheduling page with investor pre-selection and meeting statistics dashboard
- June 19, 2025. Integrated scheduling system into navigation as "Schedule/일정 예약" under Meetings submenu
- June 19, 2025. Updated NDR/Conferences navigation text to simplified "NDR/컨퍼런스" format per user preference
- June 20, 2025. Created comprehensive Analyst database system with complete CRUD operations and bilingual interface
- June 20, 2025. Added Analyst table with fields: name, email, phone, company, position, specialization, coverage, language, country, status, notes
- June 20, 2025. Implemented Analyst API routes with full validation and error handling
- June 20, 2025. Built Analyst frontend with form creation, editing, viewing, and deletion capabilities
- June 20, 2025. Added Analysts as submenu under Investors/투자자 navigation per user request
- June 20, 2025. Updated Analyst position field to dropdown with Korean options: 애널리스트, RA, 리서치해드, 기타
- June 20, 2025. Changed Status/상태 field to Coverage/커버리지여부 with Yes/No selection options
- June 20, 2025. Added CSV upload functionality for Analyst database with flexible header mapping
- June 20, 2025. Created sample analyst CSV with Korean headers: 이름, 회사, 담당산업, Coverage 여부, 이메일주소, 전화번호
- June 20, 2025. Implemented CSV validation requiring only Name and Company fields, all other fields optional
- June 20, 2025. Added comprehensive CSV format information card with bilingual instructions and sample headers
- June 20, 2025. Updated analyst table display to show Email field instead of Country field per user request
- June 20, 2025. Updated field terminology from "담당산업" to "Specialization / 담당분야" in analyst table and view dialog
- June 20, 2025. Added 4 new industry specialization options to analyst form: 반도체 (Semiconductor), 방산 (Defense), 기계 (Machinery), 조선 (Shipbuilding)
- June 20, 2025. Removed Country/국가 field from analyst form interface while maintaining database compatibility with default "Korea" value
- June 20, 2025. Updated CSV upload format documentation to reflect "Specialization / 담당분야" terminology change
- June 20, 2025. Added Phone / 전화번호 column to analyst table display between Specialization and Email fields
- June 20, 2025. Moved Analysts / 애널리스트 from submenu under Investors to main navigation menu item
- June 20, 2025. Changed navigation menu from "Companies / 회사" to "AMC / 운용사" (Asset Management Companies)
- June 20, 2025. Updated Companies page header to "Asset Management Companies / 자산운용사" with simplified description
- June 20, 2025. Converted Companies page from card layout to professional table format with bilingual column headers
- June 20, 2025. Added "Schedule / 일정 예약" to Quick Actions sidebar alongside "Add Investor / 투자자 추가"
- June 20, 2025. Created comprehensive Documents system with PDF/file upload functionality, categorization, search, and table-based management
- June 20, 2025. Added documents database table with file metadata, investor/company linking, and tagging system
- June 20, 2025. Implemented complete document API routes with multer file upload support for PDF, DOC, DOCX, TXT, JPEG, PNG files
- June 20, 2025. Built Documents frontend with drag-drop upload, category selection, file size display, and bilingual interface
- June 22, 2025. Fixed Communication form submission by resolving date validation error - server now converts date strings to Date objects
- June 22, 2025. Added individual investor/analyst selection feature for email campaigns with checkbox interface
- June 22, 2025. Enhanced email campaign targeting with two modes: region-based and specific person selection
- June 22, 2025. Updated email campaign database schema with target_type, specific_investor_ids, and specific_analyst_ids fields
- June 22, 2025. Changed investor form section title from "Additional Details (Optional)" to "R&R정보" per user request
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
UI Language: Korean/English bilingual display - show both Korean and English text throughout the interface.
```