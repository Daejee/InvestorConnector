import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard-new";
import Investors from "@/pages/investors";
import OverseasInvestors from "@/pages/overseas-investors";
import Companies from "@/pages/companies";
import OverseasCompanies from "@/pages/overseas-companies";
import Email from "@/pages/email";
import Documents from "@/pages/documents";
import Reports from "@/pages/reports";
import Funds from "@/pages/funds";
import OverseasFunds from "@/pages/overseas-funds";
import MeetingLogs from "@/pages/meeting-logs-clean";

import NdrConferences from "@/pages/ndr-conferences";
import OtherEvents from "@/pages/other-events";
import Analysts from "@/pages/analysts";
import SecuritiesFirms from "@/pages/securities-firms";
import EmailLogs from "@/pages/email-logs";
import Users from "@/pages/users";
import InvestorInsights from "@/pages/investor-insights";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/investors" component={Investors} />
        <Route path="/overseas-investors" component={OverseasInvestors} />
        <Route path="/analysts" component={Analysts} />
        <Route path="/companies" component={Companies} />
        <Route path="/overseas-companies" component={OverseasCompanies} />
        <Route path="/securities-firms" component={SecuritiesFirms} />
        <Route path="/email" component={Email} />
        <Route path="/email-logs" component={EmailLogs} />
        <Route path="/funds" component={Funds} />
        <Route path="/overseas-funds" component={OverseasFunds} />
        <Route path="/meeting-logs" component={MeetingLogs} />
        <Route path="/meetings" component={MeetingLogs} />

        <Route path="/ndr-conferences" component={NdrConferences} />
        <Route path="/other-events" component={OtherEvents} />
        <Route path="/documents" component={Documents} />
        <Route path="/users" component={Users} />
        <Route path="/reports" component={Reports} />
        <Route path="/investor-insights" component={InvestorInsights} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
