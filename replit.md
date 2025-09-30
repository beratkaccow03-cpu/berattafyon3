# Berat Çakıroğlu - Ders Analiz/Takip Projesi

## Project Overview
This is a full-stack TypeScript study tracking and analysis application designed for exam preparation (TYT/AYT - Turkish university entrance exams). The application helps students track tasks, study progress, exam results, and provides analytics.

## Current State
- ✅ Successfully imported from GitHub and configured for Replit environment
- ✅ Application running smoothly on port 5000
- ✅ Using in-memory storage (MemStorage) for development
- ✅ All dependencies installed and working
- ✅ Development workflow configured with webview output
- ✅ Deployment configuration ready (autoscale mode)
- ✅ Frontend proxy configuration verified (allowedHosts: true)
- ✅ Vite HMR working correctly
- ⚠️ Minor TypeScript warnings in schema.ts (drizzle-zod compatibility - does not affect runtime)

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
- ✅ Fresh GitHub import setup completed for Replit environment
- ✅ Configured development workflow ("Start application" on port 5000 with webview output)
- ✅ Set up deployment configuration (autoscale mode) for production
- ✅ Verified frontend/backend integration working properly
- ✅ Application running smoothly with in-memory storage
- ✅ All dependencies pre-installed and working correctly
- ✅ Vite HMR properly configured with proxy support (allowedHosts: true in vite.config.ts)
- ✅ Server bound to 0.0.0.0:5000 for Replit compatibility
- ✅ Improved schema type definitions for better code clarity
- ✅ **MAJOR EMAIL REPORT ENHANCEMENT**:
  - Redesigned card layouts (numbers at bottom center, titles at top, descriptions under titles)
  - "Toplam Aktivite" and "Tamamlanan Görevler" now full-width single column cards
  - Added "En Çok Soru Çözülen Tarih" statistic with date and question count
  - Added wrong topics tracking from exam results (wrong_topics_json parsing)
  - Exam details now show wrong topics for each subject with detailed breakdown
  - Enhanced statistics calculation with date-based tracking
- ✅ **UI/UX IMPROVEMENTS IN ADVANCED CHARTS** (Latest):
  - **Filtered frequent wrong topics**: Added `.filter(topic => topic.frequency >= 3)` to missingTopics calculation in advanced-charts.tsx to show only topics with 3+ errors across all sources (exams + questions), improving focus on truly problematic topics
  - **Improved frequency badge spacing**: Enhanced error analysis section layout by increasing gap from `gap-3` to `gap-4` and adding `ml-auto` to frequency badges ("{frequency} Kez"), providing better visual separation between checkboxes and badges
  - **Verified statistics cards**: Confirmed report modal statistics cards (Tamamlanan Görev, Çözülen Soru, Yapılan Deneme, Toplam Aktivite) are properly centered with text-center classes
- ℹ️ Minor TypeScript warnings present in drizzle-zod schemas (runtime unaffected)

## Notes
- Application is in Turkish language
- Designed for Turkish university entrance exams (TYT/AYT)
- Uses custom purple theme with dark mode support
- Ready for production deployment
