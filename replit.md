# Pattern Discovery App - Architecture Overview

## Overview

This is a mobile-first web application built on a peer-to-peer data economy where users explore Christopher Alexander's architectural patterns in the real world. The app features anonymous user identity, location-based pattern discovery, time-based voting power, and a token-based data marketplace.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### January 15, 2025 - Saved Locations Display Fix
- ✓ Fixed saved locations not appearing in web browser insights tab
- ✓ Verified device fingerprint system generates consistent user IDs
- ✓ Confirmed saved locations API correctly fetches data using persistent user ID
- ✓ Added collapsible Recent Highlights section with explanatory text and activity link
- ✓ System properly handles user_device_* format for persistent identification

### January 15, 2025 - UI Consistency & Header Formatting
- ✓ Fixed Economy and Settings tab username display formatting inconsistencies
- ✓ Standardized status bar with animated pulse indicator and username display
- ✓ Unified header structure with consistent app icon, title, and subtitle formatting
- ✓ Added proper device fingerprint integration for username generation
- ✓ Updated layout structure with appropriate content overflow handling
- ✓ Ensured all tabs now use the same visual design pattern

### January 15, 2025 - Enhanced Contextual Analysis System
- ✓ Significantly expanded building analysis with comprehensive architectural details
- ✓ Added number of stories/floors analysis with average calculations
- ✓ Implemented building height analysis in meters with categorization
- ✓ Enhanced architectural style detection and material identification
- ✓ Added detailed land use breakdown (residential vs commercial types)
- ✓ Expanded transport infrastructure analysis with node categorization
- ✓ Implemented environmental feature detection (green spaces, water, historical sites)
- ✓ Added Alexander pattern adherence indicators with visual compliance checking
- ✓ Created diversity and livability scoring metrics for comprehensive urban assessment
- ✓ Enhanced frontend display with organized sections for all architectural data

### January 15, 2025 - Complete Saved Locations System Enhancement
- ✓ Fixed saved locations not updating in insights tab after saving
- ✓ Resolved user ID consistency issue between location saving and fetching
- ✓ Updated location analysis page to use persistent user ID instead of session-based ID
- ✓ Enhanced backend API routes to handle both query parameter and path parameter patterns
- ✓ Improved cache invalidation with broader scope to catch all saved-locations queries
- ✓ Migrated 47 orphaned saved locations from temporary session IDs to persistent user ID
- ✓ Fixed device fingerprint ID mismatch between frontend and database
- ✓ Replaced "Recently Saved" section with collapsible dropdown showing all saved locations
- ✓ Added scrollable interface with count display for better mobile experience
- ✓ Ensured data consistency across activity and insights pages

### January 15, 2025 - Onboarding & GPS Centering Implementation
- ✓ Implemented one-time location access control during user onboarding
- ✓ Enhanced map centering to automatically focus on GPS coordinates when first acquired
- ✓ Added smooth map animations with appropriate zoom levels for initial GPS positioning
- ✓ Onboarding state persistence in localStorage to prevent repeated permission requests
- ✓ Clean user experience flow from welcome screens through location setup
- ✓ Verified GPS accuracy handling and pattern suggestion generation working correctly

## System Architecture

### Frontend Architecture
- **React + TypeScript** with Vite for fast development
- **Tailwind CSS** + **shadcn/ui** for consistent UI components
- **Wouter** for lightweight client-side routing
- **React Query** for state management and data fetching
- **Mobile-first responsive design** with 5-tab bottom navigation

### Backend Architecture
- **Express.js** server with TypeScript
- **PostgreSQL** database with Drizzle ORM
- **Anonymous session-based authentication** (no passwords/emails)
- **RESTful API** design with comprehensive error handling

### Data Storage Solutions
- **PostgreSQL** as primary database via Neon
- **Drizzle ORM** for type-safe database operations
- **Local storage** for session persistence and offline capabilities
- **Device fingerprinting** for consistent anonymous identity

### Authentication and Authorization
- **Anonymous user system** with device fingerprinting
- **Two-word fictitious usernames** (e.g., "Swift Falcon", "Calm River")
- **Session-based tracking** without personal data collection
- **Time-based voting weights** based on location presence

## Key Components

### 1. Pattern Discovery System
- **253 Christopher Alexander patterns** from "A Pattern Language"
- **ML-based pattern suggestions** for analyzed locations
- **Community voting system** with time-weighted influence
- **Real-world pattern conformance analysis**

### 2. Location Tracking & Analysis
- **Enhanced GPS tracking** with high accuracy settings and drift prevention
- **Accuracy validation** rejecting readings over 100m for precision
- **Spatial clustering** to identify visit patterns
- **Time accumulation** for voting power calculation
- **Movement pattern analysis** for community insights

### 3. Anonymous Identity System
- **Device fingerprinting** using screen size, timezone, language
- **Consistent username generation** from device characteristics
- **Visual avatars** with unique colors and initials
- **Privacy-first approach** with no personal data collection

### 4. Token Economy
- **Data contribution rewards** for location tracking and analysis
- **Bitcoin-like supply cap** (21M tokens) with halving mechanism
- **Peer-to-peer transfers** between users
- **Data marketplace** for trading spatial insights

### 5. Data Marketplace
- **Packaged data products** (spatial analysis, pattern insights)
- **Token-based transactions** for data access
- **Quality ratings** and sales tracking
- **Community-driven data valuation**

## Data Flow

### 1. User Onboarding
1. Device fingerprinting generates unique anonymous ID
2. Two-word username created from device characteristics
3. Initial token balance awarded (100 tokens)
4. Session tracking begins automatically

### 2. Location Discovery
1. GPS coordinates captured every 30 seconds
2. Spatial points clustered by proximity (20m radius)
3. Time accumulation calculated for voting power
4. Pattern suggestions generated using ML algorithms

### 3. Pattern Analysis
1. Christopher Alexander patterns matched to locations
2. Community voting with time-weighted influence
3. Real-world conformance analysis performed
4. Recommendations generated for improvements

### 4. Data Economy
1. Tokens earned for valuable data contributions
2. Data packaged into sellable products
3. Peer-to-peer transfers enable gift economy
4. Marketplace facilitates data trading

## External Dependencies

### Core Infrastructure
- **Neon PostgreSQL** for cloud database hosting
- **Replit** for development and deployment environment
- **Browser Geolocation API** for location tracking
- **Web Crypto API** for device fingerprinting

### UI Components
- **shadcn/ui** component library
- **Radix UI** for accessible primitives
- **Lucide React** for consistent iconography
- **Tailwind CSS** for utility-first styling

### Data Processing
- **Drizzle ORM** for database operations
- **date-fns** for date manipulation
- **crypto.subtle** for hash generation
- **Browser storage APIs** for persistence

## Deployment Strategy

### Development Environment
- **Replit-optimized** Vite configuration
- **Hot module replacement** for fast iteration
- **Runtime error overlay** for debugging
- **Cartographer plugin** for Replit integration

### Production Build
- **Vite production build** with optimization
- **ESBuild** for server bundling
- **Static asset serving** from Express
- **Environment-based configuration**

### Database Management
- **Drizzle migrations** for schema evolution
- **Connection pooling** via Neon serverless
- **Type-safe database operations**
- **Automatic schema validation**

### Key Technical Decisions

1. **Anonymous Identity**: Device fingerprinting chosen over traditional auth to maintain privacy while preventing multiple accounts
2. **Time-based Voting**: Voting power scales with time spent at location to ensure informed community decisions
3. **Token Economy**: Bitcoin-like supply cap creates scarcity and value for quality data contributions
4. **Mobile-first Design**: 5-tab navigation optimized for thumb-friendly mobile interaction
5. **Peer-to-peer Architecture**: Direct user-to-user transfers enable gift economy and community collaboration

The system balances privacy protection with community participation, creating a valuable data economy around architectural pattern discovery.