# Berat Çakıroğlu - Personal Study Tracker & Analysis System

## Overview
This is a comprehensive personal study tracking and analysis system designed for Turkish university entrance exam preparation (TYT/AYT). The application helps track tasks, study sessions, exam results, mood, and provides detailed analytics for academic performance.

## Recent Changes
- **September 29, 2025**: Successfully imported GitHub repository and set up for Replit environment
- Configured PostgreSQL database with Drizzle ORM
- Set up development workflow on port 5000 
- Configured deployment settings for production

## Project Architecture

### Frontend (React + TypeScript)
- **Location**: `client/` folder
- **Framework**: React with Vite
- **UI Library**: Radix UI components with custom styling
- **Styling**: Tailwind CSS
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack React Query for server state

### Backend (Express + TypeScript)
- **Location**: `server/` folder
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Storage**: Currently using in-memory storage (MemStorage class), but database schema is set up for migration
- **Features**: RESTful API for tasks, moods, goals, question logs, exam results

### Database Schema
- **Tasks**: Goal tracking with categories, priorities, due dates
- **Moods**: Daily mood tracking with emojis and notes  
- **Goals**: Target setting for TYT/AYT net scores and rankings
- **Question Logs**: Detailed subject-wise study session tracking
- **Exam Results**: Mock exam results with detailed analytics
- **Flashcards**: Study material management

### Key Features
1. **Dashboard**: Overview with countdown timer, weather widget, tasks summary
2. **Task Management**: Priority-based task system with categories (türkçe, matematik, fizik, etc.)
3. **Study Analytics**: Question-by-question tracking with wrong topic analysis
4. **Net Calculator**: TYT/AYT score calculation and ranking estimation
5. **Mood Tracking**: Daily emotional state monitoring
6. **Weather Integration**: OpenWeather API integration (currently using static data)
7. **Goal Setting**: Target tracking for exam preparation
8. **Report Generation**: PDF generation for study reports

## Development Setup

### Environment Configuration
- **Development Server**: `npm run dev` on port 5000
- **Production Build**: `npm run build` then `npm start`
- **Database**: PostgreSQL with migrations via `npm run db:push`

### Deployment Configuration
- **Target**: Autoscale deployment (stateless web application)
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Port**: 5000 (configured for Replit proxy)
- **Note**: Currently using in-memory storage; consider migrating to PostgreSQL for data persistence in production

## User Preferences
- **Language**: Turkish (application is fully localized)
- **Academic Focus**: Turkish university entrance exams (TYT/AYT)
- **Location**: Sakarya, Serdivan (for weather data)
- **Theme**: Purple/violet color scheme throughout the application

## Current Status
✅ Project successfully imported and running in Replit environment  
✅ Database configured and migrations applied  
✅ Development workflow active on port 5000  
✅ Frontend and backend communication working  
✅ All major features functional  
✅ Deployment configuration ready  

## Next Steps
- Consider migrating from in-memory storage to actual PostgreSQL database queries
- Add OpenWeather API key for real weather data
- Set up email functionality for study reports (SendGrid integration available)
- Potential integration with external APIs for more comprehensive exam data