import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OrganizationProvider } from "@/contexts/OrganizationContext";
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
import Scheduling from "@/pages/scheduling";
import Analysts from "@/pages/analysts";
import SecuritiesFirms from "@/pages/securities-firms";
import EmailLogs from "@/pages/email-logs";
import Users from "@/pages/users";
import InvestorInsights from "@/pages/investor-insights";
import AnalystReports from "@/pages/analyst-reports";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <OrganizationProvider>
      <Layout>
        <Switch>
          {/* Organization-based routes */}
          <Route path="/org/:orgDomain" component={Dashboard} />
          <Route path="/org/:orgDomain/dashboard" component={Dashboard} />
          <Route path="/org/:orgDomain/investors" component={Investors} />
          <Route path="/org/:orgDomain/overseas-investors" component={OverseasInvestors} />
          <Route path="/org/:orgDomain/analysts" component={Analysts} />
          <Route path="/org/:orgDomain/companies" component={Companies} />
          <Route path="/org/:orgDomain/overseas-companies" component={OverseasCompanies} />
          <Route path="/org/:orgDomain/securities-firms" component={SecuritiesFirms} />
          <Route path="/org/:orgDomain/email" component={Email} />
          <Route path="/org/:orgDomain/email-logs" component={EmailLogs} />
          <Route path="/org/:orgDomain/funds" component={Funds} />
          <Route path="/org/:orgDomain/overseas-funds" component={OverseasFunds} />
          <Route path="/org/:orgDomain/meeting-logs" component={MeetingLogs} />
          <Route path="/org/:orgDomain/meetings" component={MeetingLogs} />
          <Route path="/org/:orgDomain/ndr-conferences" component={NdrConferences} />
          <Route path="/org/:orgDomain/other-events" component={OtherEvents} />
          <Route path="/org/:orgDomain/scheduling" component={Scheduling} />
          <Route path="/org/:orgDomain/schedule" component={Scheduling} />
          <Route path="/org/:orgDomain/documents" component={Documents} />
          <Route path="/org/:orgDomain/users" component={Users} />
          <Route path="/org/:orgDomain/reports" component={Reports} />
          <Route path="/org/:orgDomain/investor-insights" component={InvestorInsights} />
          <Route path="/org/:orgDomain/analyst-reports" component={AnalystReports} />
          
          {/* Legacy routes redirect to default organization */}
          <Route path="/" component={() => { window.location.href = '/org/default'; return null; }} />
          <Route path="/investors" component={() => { window.location.href = '/org/default/investors'; return null; }} />
          <Route path="/overseas-investors" component={() => { window.location.href = '/org/default/overseas-investors'; return null; }} />
          <Route path="/analysts" component={() => { window.location.href = '/org/default/analysts'; return null; }} />
          <Route path="/companies" component={() => { window.location.href = '/org/default/companies'; return null; }} />
          <Route path="/overseas-companies" component={() => { window.location.href = '/org/default/overseas-companies'; return null; }} />
          <Route path="/securities-firms" component={() => { window.location.href = '/org/default/securities-firms'; return null; }} />
          <Route path="/email" component={() => { window.location.href = '/org/default/email'; return null; }} />
          <Route path="/email-logs" component={() => { window.location.href = '/org/default/email-logs'; return null; }} />
          <Route path="/funds" component={() => { window.location.href = '/org/default/funds'; return null; }} />
          <Route path="/overseas-funds" component={() => { window.location.href = '/org/default/overseas-funds'; return null; }} />
          <Route path="/meeting-logs" component={() => { window.location.href = '/org/default/meeting-logs'; return null; }} />
          <Route path="/meetings" component={() => { window.location.href = '/org/default/meetings'; return null; }} />
          <Route path="/ndr-conferences" component={() => { window.location.href = '/org/default/ndr-conferences'; return null; }} />
          <Route path="/other-events" component={() => { window.location.href = '/org/default/other-events'; return null; }} />
          <Route path="/scheduling" component={() => { window.location.href = '/org/default/scheduling'; return null; }} />
          <Route path="/schedule" component={() => { window.location.href = '/org/default/schedule'; return null; }} />
          <Route path="/documents" component={() => { window.location.href = '/org/default/documents'; return null; }} />
          <Route path="/users" component={() => { window.location.href = '/org/default/users'; return null; }} />
          <Route path="/reports" component={() => { window.location.href = '/org/default/reports'; return null; }} />
          <Route path="/investor-insights" component={() => { window.location.href = '/org/default/investor-insights'; return null; }} />
          <Route path="/analyst-reports" component={() => { window.location.href = '/org/default/analyst-reports'; return null; }} />
          
          <Route component={NotFound} />
        </Switch>
      </Layout>
    </OrganizationProvider>
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
