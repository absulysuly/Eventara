# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Eventara** is a multi-lingual event discovery and management platform for the Kurdistan Region and Iraq, featuring AI-powered event creation capabilities. The application supports English, Arabic, and Kurdish languages with full RTL support.

Built with React 19 + TypeScript and Vite, using Google's Gemini AI for intelligent event creation and image generation.

## Architecture

### Core Structure
- **App.tsx**: Main application component managing all state and UI coordination
- **types.ts**: Central type definitions for all data models (Event, User, City, Category, etc.)
- **services/**: Core business logic and external integrations
- **components/**: Reusable UI components (modals, carousels, forms)
- **data/mockData.ts**: Mock data for cities, categories, events, and users

### Key Services
- **api.ts**: Mock API layer simulating backend operations (CRUD for events, auth, reviews)
- **geminiService.ts**: AI integration using Google Gemini for event generation and image creation
- **loggingService.ts**: Centralized logging and analytics (console-based, ready for production services)

### State Management
The app uses React's built-in state management with multiple state categories:
- **Data State**: Events, cities, categories, loading states
- **UI State**: Language, modals, selected items, AI autofill data
- **Auth State**: Current user, email verification status
- **Filter State**: Search queries, category/city filters, date ranges

### Multi-language Architecture
- **LocalizedString** interface for all user-facing text (en/ar/ku)
- Dynamic RTL/LTR layout switching based on language selection
- All content, including mock data, is fully localized

### AI Integration
- Event creation with natural language prompts
- Automatic categorization and city suggestion
- AI-generated event images using Gemini's Imagen model
- Multi-modal input support (text + image prompts)

## Common Development Commands

### Environment Setup
```bash
# Install dependencies
npm install

# Create environment file and add your Gemini API key
# Create .env.local file with:
# GEMINI_API_KEY=your_api_key_here
```

### Development
```bash
# Start development server (usually runs on http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Workflow
- The app loads mock data from `data/mockData.ts` on startup
- All API calls are simulated with delays to mimic real network conditions
- User authentication uses mock accounts (see USERS array in mockData.ts)
- AI features require a valid GEMINI_API_KEY environment variable

## Key Configuration

### Vite Configuration
- Path aliases: `@/*` maps to project root
- Environment variables are injected at build time
- Gemini API key is exposed as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`

### TypeScript Configuration
- ES2022 target with React JSX transform
- Experimental decorators enabled
- Path mapping for `@/*` imports
- All files treated as modules (`moduleDetection: "force"`)

## Important Implementation Notes

### Authentication Flow
- Mock authentication with email/password
- Email verification simulation (can be skipped for development)
- User state persists only during session (no localStorage implementation)

### Event Management
- Events support CRUD operations through mock API
- Reviews and ratings can be added to events
- Featured and "top" events are displayed prominently
- Event editing preserves existing data while allowing updates

### AI Event Creation
- Requires valid Gemini API key to function
- Supports text-only or text+image prompts
- Automatically suggests appropriate city and category
- Generates localized titles and descriptions
- Creates custom event images via Imagen model

### Data Relationships
- Events link to organizers (Users), cities, and categories by ID
- Reviews are embedded within Event objects
- Mock data includes realistic Iraqi/Kurdish cities and cultural contexts

## Styling and UI

The application uses Tailwind-style classes with custom color variables:
- Primary colors for main actions and branding
- Neutral backgrounds with proper contrast
- Accent colors for AI-related features
- Full responsive design with mobile-first approach
- Custom styling for RTL languages (Arabic/Kurdish)

## Local Development Tips

- Mock users are available in `data/mockData.ts` with credentials `password123`
- Default user: `salar@example.com` / `password123`
- The AI Assistant button only appears for logged-in users
- Language switching affects both content and layout direction
- All timestamps use ISO format and are handled in local timezone