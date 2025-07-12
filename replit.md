# Pattern Discovery Mobile App

## Overview
A cutting-edge React web application for architectural pattern discovery, focusing on robust geospatial intelligence and a decentralized data marketplace. Users can discover and influence architectural patterns in their community through location-based democratic participation.

## Key Technologies
- React + TypeScript frontend with Wouter routing
- Express.js backend with PostgreSQL database
- Drizzle ORM for database operations
- Geospatial data processing and GPS tracking
- Token-based economy system
- Anonymous user identification via device fingerprinting

## Recent Changes (Latest First)

### 2025-01-12: GPS-Based Username Generation System ✅
- **Added GPS location capture during device registration**
- **Created global language pools for 6 world regions:**
  - North America (English, Spanish, French)
  - Europe (English, Spanish, French, German, Italian)
  - Asia (Japanese, Chinese, Hindi romanized)
  - Africa (English, Swahili, Arabic romanized)
  - South America (Spanish, Portuguese)
  - Oceania (English, Maori, Pacific islands)
- **Database schema updated** with creation_latitude, creation_longitude, language_region fields
- **Backend server-side username generator** created for GPS-based username assignment
- **Frontend geolocation integration** captures user coordinates during onboarding
- **Culturally appropriate usernames** generated based on user's geographic location

### Previous Features
- Comprehensive UI consistency across six navigation tabs
- Functional data marketplace and token economy backend systems
- Database schema with GPS coordinate storage
- Anonymous device registration system
- Time-based voting eligibility system
- Alexander's pattern analysis and community clustering

## Project Architecture

### Frontend Structure
- `/client/src/pages/` - Main application pages
- `/client/src/components/` - Reusable UI components  
- `/client/src/lib/` - Utility libraries and helpers
- `/client/src/hooks/` - Custom React hooks

### Backend Structure
- `/server/routes.ts` - API endpoint definitions
- `/server/storage.ts` - Database storage interface
- `/server/db.ts` - Database connection and configuration
- `/server/username-generator-server.ts` - GPS-based username generation
- `/shared/schema.ts` - Database schema and type definitions

### Key Features Implemented
1. **Anonymous User System** - Device fingerprinting with unique username generation
2. **GPS-Based Username Assignment** - Cultural language pools based on registration location
3. **Token Economy** - Earn tokens for data contribution and location tracking
4. **Pattern Discovery** - Alexander's architectural patterns with GPS-based analysis
5. **Data Marketplace** - Buy/sell location and pattern data using tokens
6. **Community Analysis** - Detect communities and analyze pattern adherence

## User Preferences
- Focus on privacy-first, anonymous user experience
- Emphasize cultural diversity in username generation
- Maintain educational approach to architectural patterns
- Prioritize location-based features and GPS accuracy

## Current State
The application now features complete GPS-based username generation using global language pools. When users register their device, their GPS coordinates determine which regional language pool generates their unique anonymous username, creating culturally relevant identities worldwide.

## Next Steps
- Test GPS-based username generation across different global locations
- Validate cultural accuracy of language pools
- Enhance onboarding experience with location-specific messaging
- Add analytics for username generation patterns by region