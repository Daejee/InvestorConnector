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
- **File Upload**: Multer (for document uploads)

### Development Tools
- **Type Safety**: TypeScript
- **Database Migrations**: Drizzle Kit
- **Bundling**: Vite, ESBuild