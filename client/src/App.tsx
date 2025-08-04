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
import SettingsPage from "@/pages/settings";
import LocationAnalysisPage from "@/pages/location-analysis";
import CommunityAnalysisPage from "@/pages/community-analysis";
import RealWorldAnalysisPage from "@/pages/real-world-analysis";
import TimeTrackingDemoPage from "@/pages/time-tracking-demo";
import TokenWalletPage from "@/pages/token-wallet";
import CommunityDemoPage from "@/pages/community-demo";
import DataMarketplacePage from "@/pages/data-marketplace";
import EconomyPage from "@/pages/economy";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={DiscoverPage} />
      <Route path="/patterns" component={PatternsPage} />
      <Route path="/patterns/:id" component={PatternDetailPage} />
      <Route path="/curated-patterns/:locationId" component={CuratedPatternsPage} />
      <Route path="/activity" component={ActivityPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/location-analysis" component={LocationAnalysisPage} />
      <Route path="/community-analysis" component={CommunityAnalysisPage} />
      <Route path="/real-world-analysis" component={RealWorldAnalysisPage} />
      <Route path="/time-tracking" component={TimeTrackingDemoPage} />
      <Route path="/token-wallet" component={TokenWalletPage} />
      <Route path="/community-demo" component={CommunityDemoPage} />
      <Route path="/communication" component={Communication} />
      <Route path="/data-marketplace" component={DataMarketplacePage} />
      <Route path="/economy" component={EconomyPage} />
      <Route path="/insights" component={InsightsPage} />
      <Route path="/onboarding" component={OnboardingPage} />
      <Route path="/offline-patterns" component={OfflinePatternsPage} />
      <Route path="/patterns-suggested-info" component={PatternsSuggestedInfo} />
      <Route path="/votes-cast-info" component={VotesCastInfo} />
      <Route path="/locations-tracked-info" component={LocationsTrackedInfo} />
      <Route path="/hours-contributed-info" component={HoursContributedInfo} />
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
