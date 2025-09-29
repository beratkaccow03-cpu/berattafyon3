# Overview

This is a Turkish educational analytics and task tracking system called "Afyonlu" developed by Berat Çakıroğlu. The application is designed to help students preparing for the YKS (Turkish university entrance exam) track their study progress, analyze their performance, and manage their tasks. It features comprehensive analytics for TYT and AYT exam preparation, including question logs, exam results tracking, mood monitoring, and goal setting.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: Radix UI primitives with shadcn/ui component library
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite for development and bundling
- **Theme System**: Custom dark/light theme provider with localStorage persistence

## Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Database ORM**: Drizzle ORM with PostgreSQL
- **API Design**: RESTful API with dedicated routes for tasks, moods, goals, question logs, exam results, and flashcards
- **File Handling**: PDF generation using pdf-lib and PDFKit
- **Development**: Hot module reloading with Vite middleware integration

## Database Schema
- **Tasks**: Task management with categories (subjects like matematik, fizik, etc.), priorities, recurrence patterns, and completion tracking
- **Moods**: Mood tracking with emoji support and notes
- **Goals**: Target setting with progress tracking for different exam categories
- **Question Logs**: Detailed question analysis by subject and topic with correct/wrong/blank counts
- **Exam Results**: TYT and AYT exam performance tracking with net scores
- **Flashcards**: Spaced repetition system for study cards with difficulty levels
- **Exam Subject Nets**: Subject-specific performance tracking for exams

## Key Features
- **Analytics Dashboard**: Comprehensive charts and visualizations for performance tracking
- **Task Management**: Subject-categorized task system with recurrence support
- **Question Analysis**: Topic-based error tracking and priority identification
- **Exam Simulation**: Net calculator for TYT/AYT score prediction
- **Study Timer**: Pomodoro-style timer with session tracking
- **Weather Integration**: Real-time weather data for study environment optimization
- **Email Reporting**: Automated progress reports via email integration

## Design Patterns
- **Component Composition**: Modular React components with clear separation of concerns
- **Custom Hooks**: Reusable logic for mobile detection and toast notifications
- **Mutation Patterns**: Optimistic updates with TanStack Query mutations
- **Error Boundaries**: Graceful error handling throughout the application
- **Responsive Design**: Mobile-first approach with adaptive layouts

# External Dependencies

## Database
- **Neon Database**: PostgreSQL serverless database with connection pooling
- **Drizzle ORM**: Type-safe database operations with schema validation

## UI and Styling
- **Radix UI**: Accessible primitive components for complex UI patterns
- **Tailwind CSS**: Utility-first CSS framework with custom design system
- **Recharts**: Chart library for data visualization and analytics
- **React Hook Form**: Form handling with Zod validation schemas

## Development Tools
- **TypeScript**: Static type checking for enhanced developer experience
- **Vite**: Fast development server with hot module replacement
- **ESBuild**: Fast JavaScript bundler for production builds

## External APIs
- **Weather API**: Real-time weather data integration
- **Email Services**: SendGrid and Nodemailer for automated reporting
- **PDF Generation**: Server-side PDF creation for reports and exports

## Validation and Forms
- **Zod**: Runtime type validation and schema definition
- **React Hook Form**: Performant form handling with validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod

## State Management
- **TanStack Query**: Server state management with caching and synchronization
- **React Context**: Client-side state for themes and user preferences

## Additional Libraries
- **date-fns**: Date manipulation and formatting utilities
- **class-variance-authority**: Type-safe variant styling system
- **wouter**: Lightweight client-side routing solution