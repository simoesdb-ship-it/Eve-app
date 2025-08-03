# Pattern Discovery App - Compressed Overview

## Overview
This mobile-first web application facilitates the discovery of Christopher Alexander's architectural patterns in the real world through a peer-to-peer data economy. It prioritizes anonymous user identity, location-based pattern discovery, and a token-based data marketplace, allowing users to explore and contribute to a shared understanding of architectural patterns. The project envisions a future where urban development is guided by community insights derived from real-world pattern analysis.

## User Preferences
Preferred communication style: Simple, everyday language.

## Recent Changes

### February 3, 2025 - Pattern Breakdown Feature Complete
- ✓ **Comprehensive pattern analysis**: Added getUserPatterns API endpoint for retrieving user's pattern data
- ✓ **Pattern relationships**: Created analysis showing how pattern categories connect and complement each other
- ✓ **Interactive interface**: Built tabbed interface (Overview, Categories, Relationships) for pattern exploration
- ✓ **Discovery insights**: Shows pattern discovery statistics, most confident patterns, and community engagement
- ✓ **Category breakdown**: Detailed analysis by pattern category with confidence levels and top patterns
- ✓ **User request fulfilled**: Pattern breakdown now shows relationships between discovered patterns

### February 2, 2025 - Terminology Clarification Complete
- ✓ **Final terminology fix**: Changed confusing "Patterns Suggested" to "Patterns Found" throughout entire application
- ✓ **Clear distinction**: "Patterns Found" (stats counter) vs "Pattern Suggestions" (individual suggestions for locations)
- ✓ **Activity improvements**: Pattern suggestions now appear in activity feed when locations are analyzed
- ✓ **User experience**: Eliminated confusion between similar-sounding terms
- ✓ **Complete cleanup**: Updated all UI text, page titles, and route names for consistency

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