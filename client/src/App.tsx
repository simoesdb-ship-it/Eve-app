import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineIndicator } from "@/components/offline-indicator";
import MobileContainer from "@/components/mobile-container";
import DiscoverPage from "@/pages/discover";
import PatternsPage from "@/pages/patterns";
import PatternDetailPage from "@/pages/pattern-detail";
import ActivityPage from "@/pages/activity";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";
import EconomyPage from "@/pages/economy";
import LocationAnalysisPage from "@/pages/location-analysis";
import CommunityAnalysisPage from "@/pages/community-analysis";
import RealWorldAnalysisPage from "@/pages/real-world-analysis";
import TimeTrackingDemoPage from "@/pages/time-tracking-demo";
import TokenWalletPage from "@/pages/token-wallet";
import CommunityDemoPage from "@/pages/community-demo";
import DataMarketplacePage from "@/pages/data-marketplace";
import InsightsPage from "@/pages/insights";
import OnboardingPage from "@/pages/onboarding";
import OfflinePatternsPage from "@/pages/offline-patterns";
import PatternsSuggestedInfo from "@/pages/patterns-suggested-info";
import VotesCastInfo from "@/pages/votes-cast-info";
import LocationsTrackedInfo from "@/pages/locations-tracked-info";
import HoursContributedInfo from "@/pages/hours-contributed-info";
import NotFound from "@/pages/not-found";
import Communication from "@/pages/communication";
import CuratedPatternsPage from "@/pages/curated-patterns";
import AdminDashboard from "@/pages/admin-dashboard";
import IntelligentPatterns from "@/pages/intelligent-patterns";

function Router() {
  return (
    <Switch>
      {/* Main navigation routes */}
      <Route path="/" component={DiscoverPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/patterns" component={PatternsPage} />
      <Route path="/profile" component={ProfilePage} />
      
      {/* Detail pages */}
      <Route path="/patterns/:id" component={PatternDetailPage} />
      <Route path="/curated-patterns/:locationId" component={CuratedPatternsPage} />
      
      {/* Legacy routes - redirect to new structure */}
      <Route path="/settings" component={ProfilePage} />
      <Route path="/economy" component={EconomyPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/communication" component={Communication} />
      
      {/* Analysis routes - now consolidated under Insights */}
      <Route path="/location-analysis" component={LocationAnalysisPage} />
      <Route path="/community-analysis" component={CommunityAnalysisPage} />
      <Route path="/real-world-analysis" component={RealWorldAnalysisPage} />
      
      {/* Secondary features */}
      <Route path="/time-tracking" component={TimeTrackingDemoPage} />
      <Route path="/token-wallet" component={TokenWalletPage} />
      <Route path="/community-demo" component={CommunityDemoPage} />
      <Route path="/data-marketplace" component={DataMarketplacePage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/offline-patterns" component={OfflinePatternsPage} />
      
      {/* Info pages */}
      <Route path="/patterns-suggested-info" component={PatternsSuggestedInfo} />
      <Route path="/votes-cast-info" component={VotesCastInfo} />
      <Route path="/locations-tracked-info" component={LocationsTrackedInfo} />
      <Route path="/hours-contributed-info" component={HoursContributedInfo} />
      
      {/* Admin */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/intelligent-patterns" component={IntelligentPatterns} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <MobileContainer>
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
            <OfflineIndicator />
          </MobileContainer>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
