# Berat Çakıroğlu - Ders Analiz/Takip Projesi

## Project Overview
This is a full-stack TypeScript study tracking and analysis application designed for exam preparation (TYT/AYT - Turkish university entrance exams). The application helps students track tasks, study progress, exam results, and provides analytics.

## Current State
- Successfully imported and configured for Replit environment
- Application running on port 5000
- Using in-memory storage (MemStorage)
- All dependencies installed and working

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **UI Components**: Radix UI + Tailwind CSS
- **Database**: PostgreSQL (Drizzle ORM) - Currently using in-memory storage
- **Build Tools**: Vite (frontend), esbuild (backend)

## Project Structure
- `client/` - React frontend application
  - `src/components/` - UI components
  - `src/pages/` - Page components
  - `src/lib/` - Utilities and query client
- `server/` - Express backend
  - `index.ts` - Main server entry point
  - `routes.ts` - API routes
  - `storage.ts` - In-memory storage implementation
  - `vite.ts` - Vite dev server setup
- `shared/` - Shared TypeScript schemas and types

## Key Features
- Task management with categories (TYT/AYT subjects)
- Mood tracking
- Study goals tracking
- Question logs and analytics
- Exam results tracking
- Weather widget (OpenWeather API integration)
- PDF report generation
- Flashcards system
- Net score calculator

## Development
- Run: `npm run dev` (port 5000)
- Build: `npm run build`
- Start prod: `npm run start`

## Deployment
- Deployment type: autoscale
- Build command: `npm run build`
- Run command: `npm run start`
- Port: 5000

## Environment Configuration
- Frontend host: 0.0.0.0:5000 (configured)
- Backend host: localhost (integrated with frontend)
- Allowed hosts: true (proxy support enabled)
- HMR: Enabled on port 5000

## Database Notes
- Currently using in-memory storage (MemStorage class)
- Database schema defined in `shared/schema.ts`
- Drizzle ORM configured but not active
- Optional: Can be migrated to PostgreSQL by setting DATABASE_URL

## Recent Changes (2025-09-30)
- Imported from GitHub repository
- Installed all dependencies
- Configured development workflow
- Set up deployment configuration
- Verified application runs without errors
