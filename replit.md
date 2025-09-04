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

## 🚀 SaaS Expansion Plan (Multi-Tenant Architecture)

### Business Vision
Transform the current single-organization IR CRM into a multi-tenant SaaS platform where each asset management company can have their own isolated environment with dedicated login credentials and data separation.

### Multi-Tenant Architecture Design

#### 1. Data Isolation Strategy
- **Complete Data Separation**: Each organization (company) has completely isolated data
- **Security Model**: organizationId-based filtering on all database queries
- **No Data Sharing**: Investment data, meetings, and client relationships remain confidential per company
- **Row Level Security**: Database-level enforcement of data isolation

#### 2. Organization Structure
```typescript
Organization {
  id: string
  name: "삼성자산운용"
  domain: "samsung" // for samsung.ircrm.com
  logo: URL
  brandColor: "#1428A0"
  timezone: "Asia/Seoul" 
  subscription: "premium" | "professional" | "starter"
  settings: {
    meetingTypes: ["NDR", "컨퍼런스", "사무실방문"]
    workingHours: "09:00-18:00"
    customBranding: boolean
  }
  createdAt: Date
  isActive: boolean
}
```

#### 3. Authentication & Access Control
- **Company-Specific Login**: Each organization has isolated login system
- **Role-Based Access**: Admin, IR Manager, IR Staff, Viewer roles per organization  
- **Invitation System**: Organization admins can invite team members
- **Session Management**: Organization context maintained throughout user session

#### 4. Database Schema Extensions
```sql
-- Add organizationId to all existing tables
ALTER TABLE investors ADD COLUMN organizationId INT REFERENCES organizations(id);
ALTER TABLE analysts ADD COLUMN organizationId INT REFERENCES organizations(id);
ALTER TABLE meetings ADD COLUMN organizationId INT REFERENCES organizations(id);
ALTER TABLE users ADD COLUMN organizationId INT REFERENCES organizations(id);

-- Create organizations table
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  domain VARCHAR(50) UNIQUE,
  subscription_tier VARCHAR(20) DEFAULT 'starter',
  settings JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

#### 5. Template Data System
- **Default Dataset**: New organizations start with pre-populated template data
- **Template Organization (ID=0)**: Contains baseline investors, analysts, and meeting templates
- **Onboarding Options**:
  - Use template data (recommended for quick start)
  - Start with empty database
  - Import from Excel/CSV files
- **Data Copying**: Template data automatically copied to new organization with new organizationId
- **Customizable**: Organizations can modify, delete, or add to template data after onboarding

#### 6. Subscription Tiers & Pricing
- **Starter** ($99/month): 5 users, 100 investors, basic features
- **Professional** ($299/month): 20 users, 1000 investors, advanced analytics
- **Enterprise** ($899/month): Unlimited users/data, custom integrations, dedicated support

#### 7. Technical Implementation Plan

##### Phase 1: Foundation (Database & Auth) ✅ 완료
- ✅ Create organizations table and user-organization relationships
- ✅ Migrate existing data to "default organization" 
- ✅ Implement organizationId filtering in all API endpoints
- ✅ Add organization context to authentication system
- ✅ URL-based organization routing system implementation
- ✅ Complete data isolation between organizations

**Implementation Status**: 
- Organizations table with proper schema (ID=1: 기본조직, ID=2: 삼성자산운용)
- All tables include organizationId for data separation
- URL routing: `/org/default` and `/org/samsung`
- Backend API extracts organizationId from headers/URL
- Frontend automatically sends organization context
- Complete data isolation verified (752 vs 3 investors)

##### Phase 2: Multi-Tenant Core Features 🔄 진행 중
- Organization-specific login pages and branding
- Template data system and onboarding flow
- Admin dashboard for organization management
- Data isolation testing and security audit
- Organization management UI (create, edit, delete organizations)
- User invitation system per organization
- Organization settings and configuration

**Implementation Priority**:
1. Organization management dashboard for admins
2. Organization-specific branding (logo, colors, domain)
3. Template data copying system for new organizations
4. User invitation and role management system
5. Organization settings and configuration UI

##### Phase 3: SaaS Business Features 📋 계획됨
- Subscription management and billing integration (Stripe)
- Usage analytics and reporting per organization
- Custom branding and white-label options
- Advanced admin controls and organization settings
- API rate limiting per organization
- Organization usage monitoring and alerts
- Multi-language support per organization
- Custom domain support (samsung.ircrm.com)

**Implementation Priority**:
1. Subscription tier enforcement (user/investor limits)
2. Billing integration with subscription management
3. Usage analytics dashboard
4. Custom domain routing
5. Advanced security features (2FA, audit logs)
6. Performance monitoring per organization

#### 8. Security Considerations
- **API Middleware**: Automatic organizationId injection in all database queries
- **Row Level Security**: PostgreSQL RLS policies for additional data protection
- **Audit Logging**: All actions tracked with organization context
- **API Key Separation**: External service integrations (SendGrid, OpenAI) per organization

#### 9. UI/UX Changes
- **Login Flow**: Company domain/code input before user credentials
- **Header Branding**: Display organization logo and name
- **Data Context**: All views filtered and labeled with organization context
- **Admin Interface**: Organization management dashboard for platform administrators

#### 10. Migration Strategy
- **Backward Compatibility**: Existing single-tenant deployment remains functional
- **Gradual Rollout**: Phase-by-phase implementation with feature flags
- **Data Migration**: Safe migration of current data to new multi-tenant structure
- **Testing**: Comprehensive testing of data isolation between organizations

### Success Metrics
- **Customer Acquisition**: Target 50+ asset management companies in first year
- **Revenue Growth**: $50K+ MRR from subscription model
- **Data Security**: Zero data leakage incidents between organizations
- **User Adoption**: 90%+ of new organizations actively use template data