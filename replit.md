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
```

## User Preferences
```
Preferred communication style: Simple, everyday language.
```