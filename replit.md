# Overview

This is a Turkish academic analysis and tracking system called "Afyonlu" developed by Berat Çakıroğlu. The application is designed to help students track their study progress, manage tasks, analyze exam performance, and monitor their preparation for the YKS (Turkish university entrance exam). It features a comprehensive dashboard with widgets for task management, mood tracking, study session logging, exam result analysis, and weather information.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Build Tool**: Vite for development and build processes
- **UI Components**: Radix UI primitives with custom styling via class-variance-authority

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript throughout the entire stack
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **API Design**: RESTful API endpoints with proper HTTP methods
- **File Structure**: Monorepo structure with shared schema definitions
- **Development Setup**: Hot module replacement via Vite integration

## Database Schema Design
The application uses a PostgreSQL database with the following main entities:
- **Tasks**: Supports categorized tasks with priorities, due dates, and recurrence patterns
- **Moods**: Daily mood tracking with emoji support and notes
- **Goals**: Target-based goal setting with progress tracking
- **Question Logs**: Detailed study session logging with subject and topic breakdown
- **Exam Results**: Comprehensive exam performance tracking with TYT/AYT support
- **Flashcards**: Spaced repetition learning system with difficulty levels

## Key Features Architecture
- **Calendar System**: Interactive calendar with task visualization and heatmap activity tracking
- **Analytics Dashboard**: Real-time charts using Recharts for performance visualization
- **Weather Integration**: Location-based weather data for study planning
- **Email Reporting**: Automated progress reports via SendGrid/Nodemailer
- **Theme System**: Dark/light mode support with system preference detection
- **Responsive Design**: Mobile-first approach with adaptive layouts

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting via @neondatabase/serverless
- **Drizzle Kit**: Database migrations and schema management

### UI & Styling
- **Tailwind CSS**: Utility-first CSS framework
- **Radix UI**: Headless UI component primitives
- **shadcn/ui**: Pre-built component library built on Radix
- **Recharts**: Data visualization library for charts and graphs
- **Lucide React**: Icon library for consistent iconography

### Backend Services
- **SendGrid**: Email service for automated reporting (@sendgrid/mail)
- **Nodemailer**: Alternative email service integration
- **PDF-lib**: PDF generation for reports and exports

### Development Tools
- **TypeScript**: Static type checking across frontend and backend
- **ESBuild**: Fast JavaScript bundler for production builds
- **Zod**: Schema validation for API endpoints and forms
- **TanStack Query**: Server state management and caching

### Authentication & Sessions
- **connect-pg-simple**: PostgreSQL session store for Express sessions
- **Express Session**: Session management middleware

The application follows a clean architecture pattern with clear separation between presentation, business logic, and data layers. The shared schema approach ensures type safety across the full stack, while the modular component structure promotes reusability and maintainability.