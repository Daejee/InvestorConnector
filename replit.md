# IR CRM - Investor Relations Management System

## Overview
IR CRM is a comprehensive investor relations management system designed to centralize the management of investor contacts, company information, investments, communications, and meetings. The system aims to streamline investor relations activities through a modern full-stack application, providing tools for efficient data management, communication, and AI-powered insights. Its core capabilities include managing investor relationships, conducting targeted communication campaigns, scheduling meetings, and generating professional business reports. The system also supports the management of other events and comprehensive analyst report analysis.

## User Preferences
Preferred communication style: Simple, everyday language.
UI Language: Korean only display - use only Korean text for all new features and modifications.

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

### Key Components & Features
- **Database Layer**: Drizzle ORM for type-safe schema managing `investors` (Buyside), `companies` (AMC), `investments`, `communications`, `meetings`, `analysts` (Sellside), `funds`, `ndr/conferences`, `documents`, and `otherEvents`.
- **API Layer**: Express.js routes with validation, abstract storage interface, centralized error handling.
- **Frontend Components**: Dashboard, Buyside, Sellside, AMC, Funds, Meetings, NDR/Conferences, Communications, Documents, Other Events, and Analyst Reports pages.
- **Data Flow**: Client requests via TanStack Query, processed by Express server, Drizzle ORM for DB operations, responses returned to client.
- **Core Features**:
    - Complete CRUD operations for all major entities (Buyside, Sellside, AMC, Funds, Meetings, NDR/Conferences, Documents, Other Events, Analyst Reports).
    - CSV upload for bulk data import (Companies, Buyside, Sellside).
    - Email system with SendGrid for targeted campaigns.
    - Calendly-style scheduling system with real-time availability and conflict prevention.
    - Document management system with cloud file upload, categorization, and search.
    - Dynamic search and filtering across data tables.
    - Consolidated investor/analyst information display with meeting history.
    - **Meeting Management Enhancements**: 7-type meeting category selection, location field, automatic status assignment (scheduled/completed), and past meeting recording.
    - **Investor Portfolio Management**: Fields for total experience, current company experience, managed fund AUM, and number of managed funds.
    - **AI-Powered Investor Insights**: Weekly meeting analysis using OpenAI GPT-4o, generating 5-category insights with custom date range selection. Includes professional PDF and DOC export functionality with a standardized report design (blue gradient theme, Malgun Gothic font, clean table layout).
    - **Analyst Report Analysis System**: Manual data entry for analyst reports (positive factors, concerns, target prices) with PDF file upload. Features multi-report AI analysis using GPT-4o, target price parsing, and professional export options.

### UI/UX Decisions
- Consistent header and sidebar navigation with logical categories (Main, Event 관리, Client DB관리, Quick Actions).
- Use of Radix UI and shadcn/ui for accessible and themable components.
- Tailwind CSS for utility-first styling.
- Clear, intuitive layouts for data tables and forms.
- Dashboard focused on meeting management metrics and quick actions.
- Terminology updated to "Buyside" and "Sellside".
- All new features and modifications conform to the "Korean only display" preference.

## External Dependencies

### Core Dependencies
- **Database**: PostgreSQL via Neon Database
- **UI Components**: Radix UI, shadcn/ui
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form with Hookform Resolvers
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Email Service**: SendGrid
- **File Storage**: Replit Object Storage (for documents and meeting minutes)
- **PDF/DOC Export**: jsPDF, html2canvas
- **AI Integration**: OpenAI GPT-4o

### Development Tools
- **Type Safety**: TypeScript
- **Database Migrations**: Drizzle Kit
- **Bundling**: Vite, ESBuild