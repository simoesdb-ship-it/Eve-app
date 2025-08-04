# Pattern Discovery App - Compressed Overview

## Overview
This mobile-first web application facilitates the discovery of Christopher Alexander's architectural patterns in the real world through a peer-to-peer data economy. It prioritizes anonymous user identity, location-based pattern discovery, and a token-based data marketplace, allowing users to explore and contribute to a shared understanding of architectural patterns. The project envisions a future where urban development is guided by community insights derived from real-world pattern analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### February 2, 2025 - Pattern Assignment System Fixed & Enhanced Contextual Analysis
- ✓ Fixed critical "failed to assign pattern error" by implementing missing storage interface methods
- ✓ Added assignPatternToSavedLocation and getPatternsByLocationId methods to DatabaseStorage class
- ✓ Enhanced contextual pattern curator with intelligent geographic analysis based on coordinates
- ✓ Improved place type inference (gathering, circulation, recreational) using location characteristics
- ✓ Added building type detection (residential, commercial, institutional) for better pattern matching
- ✓ Enhanced natural elements detection (trees, water, vegetation) with Minnesota-specific geography
- ✓ Implemented detailed pattern-specific context reasoning with geographic coordinate analysis
- ✓ Created smart urban context analysis (urban, suburban, rural) based on coordinate precision patterns

### February 2, 2025 - Phase 1 Critical Implementation: Robust Error Handling & Offline Capabilities
- ✓ Implemented comprehensive error boundary system with automatic logging and recovery options
- ✓ Added offline queue management with automatic sync when connection returns
- ✓ Enhanced query client with exponential backoff retry logic and smart caching
- ✓ Created robust API hooks with timeout handling and offline fallbacks
- ✓ Added offline indicator with queue status and manual sync controls
- ✓ Implemented client-side error logging and persistence for debugging
- ✓ Fixed pattern suggestions in activity feed - now properly displays pattern discovery events
- ✓ Clarified terminology: "Patterns Found" (stats counter) vs "Pattern Suggestions" (individual suggestions)

### February 2, 2025 - Real-time Pattern Analysis Scale Optimization
- ✓ Implemented optimized pattern analyzer with pre-compiled keyword matching using Set operations for O(1) lookups
- ✓ Added comprehensive caching system with configurable TTL and automatic cleanup for frequently accessed data
- ✓ Created multi-layered rate limiting to prevent API abuse and ensure fair usage across endpoints
- ✓ Implemented database optimizations including spatial indexes and query performance improvements
- ✓ Added performance monitoring system with real-time metrics tracking and cache hit rate analysis
- ✓ Enhanced pattern analysis algorithm with geographic and contextual boosts for higher accuracy
- ✓ Implemented batch processing capabilities for bulk pattern suggestions to reduce database load
- ✓ Added cache warming on startup to pre-populate frequently accessed patterns and locations

## System Architecture

### Frontend Architecture
- **Frameworks:** React + TypeScript (Vite for development)
- **UI/UX:** Tailwind CSS + shadcn/ui for consistent components, Wouter for routing, React Query for state management.
- **Design Principles:** Mobile-first responsive design with a 5-tab bottom navigation for intuitive mobile interaction.

### Backend Architecture
- **Server:** Express.js with TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **Authentication:** Anonymous session-based authentication using device fingerprinting.
- **API:** RESTful API with comprehensive error handling.

### Data Storage Solutions
- **Primary Database:** PostgreSQL via Neon
- **ORM:** Drizzle ORM for type-safe operations
- **Client-side Storage:** Local storage for session persistence and offline capabilities.
- **Identity Management:** Device fingerprinting for consistent anonymous user identification.

### Authentication and Authorization
- **Anonymous System:** Device fingerprinting generates unique, persistent anonymous user IDs.
- **Usernames:** Two-word fictitious usernames (e.g., "Swift Falcon") derived from device characteristics.
- **Privacy:** Session-based tracking without personal data collection.
- **Voting Mechanics:** Time-based voting weights determined by user presence at a location.

### Key Components

- **Pattern Discovery System:** Incorporates 253 Christopher Alexander patterns, ML-based pattern suggestions, and a community voting system with time-weighted influence. It performs real-world pattern conformance analysis.
- **Location Tracking & Analysis:** Utilizes enhanced GPS tracking with accuracy validation, spatial clustering, and time accumulation for voting power. It also includes movement pattern analysis for community insights.
- **Anonymous Identity System:** Leverages device fingerprinting to create consistent, privacy-preserving user identities with visual avatars.
- **Token Economy:** Rewards data contributions with a Bitcoin-like token, featuring a supply cap and halving mechanism. It supports peer-to-peer token transfers.
- **Data Marketplace:** Facilitates the trading of packaged data products (e.g., spatial analysis, pattern insights) using tokens, with quality ratings and community-driven data valuation.

## External Dependencies

### Core Infrastructure
- **Cloud Database:** Neon PostgreSQL
- **Development/Deployment:** Replit
- **Location Services:** Browser Geolocation API
- **Security/Identity:** Web Crypto API (for device fingerprinting)

### UI Components
- **Component Library:** shadcn/ui
- **Accessibility Primitives:** Radix UI
- **Icons:** Lucide React
- **Styling:** Tailwind CSS

### Data Processing
- **ORM:** Drizzle ORM
- **Date Utilities:** date-fns
- **Cryptography:** crypto.subtle (for hash generation)
- **Client Storage:** Browser storage APIs
```