# Berat Çakıroğlu - Ders Analiz/Takip Projesi

## Project Overview
This is a full-stack TypeScript study tracking and analysis application designed for exam preparation (TYT/AYT - Turkish university entrance exams). The application helps students track tasks, study progress, exam results, and provides analytics.

## Current State
- Successfully imported from GitHub and configured for Replit environment
- Application running smoothly on port 5000
- Using in-memory storage (MemStorage) for development
- PostgreSQL database provisioned and schema pushed
- All dependencies installed and working
- Development workflow configured and tested
- Deployment configuration set up for production

## Tech Stack
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Express.js + TypeScript
- **UI Components**: Radix UI + Tailwind CSS
- **Styling**: Tailwind CSS with custom theme
- **Database**: PostgreSQL (Drizzle ORM) - Schema ready, currently using in-memory storage
- **Build Tools**: Vite (frontend), esbuild (backend)
- **Package Manager**: npm

## Project Structure
- `client/` - React frontend application
  - `src/components/` - UI components (widgets, modals, charts)
  - `src/pages/` - Page components (dashboard, timer, calculator)
  - `src/lib/` - Utilities and query client
  - `src/styles/` - Custom CSS styles
- `server/` - Express backend
  - `index.ts` - Main server entry point
  - `routes.ts` - API routes (tasks, moods, goals, logs, exams)
  - `storage.ts` - Storage interface and in-memory implementation
  - `vite.ts` - Vite dev server setup
- `shared/` - Shared TypeScript schemas and types
  - `schema.ts` - Drizzle ORM schemas and Zod validation

## Key Features
- Task management with categories (TYT/AYT subjects)
- Mood tracking with emoji support
- Study goals tracking (TYT, AYT, ranking goals)
- Question logs and analytics
- Exam results tracking with detailed subject breakdown
- Weather widget (OpenWeather API integration)
- PDF report generation
- Flashcards system
- Net score calculator
- Countdown timer
- Advanced charts and analytics

## Development
- Run: `npm run dev` (port 5000)
- Build: `npm run build`
- Start prod: `npm run start`
- Type check: `npm run check`
- Database push: `npm run db:push`

## Deployment
- Deployment type: **autoscale** (stateless, suitable for web apps)
- Build command: `npm run build`
- Run command: `npm run start`
- Port: 5000

## Environment Configuration
- Frontend host: 0.0.0.0:5000 (configured for Replit proxy)
- Backend: Integrated with frontend on same port
- Allowed hosts: true (proxy support enabled in vite.config.ts)
- HMR: Enabled on port 5000
- Database: PostgreSQL provisioned with DATABASE_URL environment variable

## Database Notes
- PostgreSQL database provisioned and schema pushed successfully
- Currently using in-memory storage (MemStorage class) for rapid development
- Database schema fully defined in `shared/schema.ts` with all tables:
  - tasks, moods, goals, questionLogs, examResults, examSubjectNets, flashcards
- To migrate to PostgreSQL: Update `server/storage.ts` to use Drizzle ORM instead of MemStorage
- All insert schemas and types are defined and ready to use

## API Routes
All API endpoints are defined in `server/routes.ts`:
- Tasks: GET/POST/PUT/PATCH/DELETE /api/tasks
- Moods: GET/POST /api/moods
- Goals: GET/POST/PUT/DELETE /api/goals
- Question Logs: GET/POST/DELETE /api/question-logs
- Exam Results: GET/POST/DELETE /api/exam-results
- Subject Stats: GET /api/topic-stats, /api/priority-topics, /api/subject-solved-stats
- PDF Reports: POST /api/generate-pdf-report

## Recent Changes (2025-09-30)
- Imported from GitHub repository (beratcode03/beratders)
- Installed all dependencies successfully
- Configured development workflow ("Start application" on port 5000)
- Set up deployment configuration (autoscale)
- Provisioned PostgreSQL database and pushed schema
- Verified application runs without errors
- Removed duplicate "Server" workflow
- Tested frontend and confirmed working properly

## Notes
- Application is in Turkish language
- Designed for Turkish university entrance exams (TYT/AYT)
- Uses custom purple theme with dark mode support
- Ready for production deployment
