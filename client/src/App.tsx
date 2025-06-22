import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/layout/layout";
import Dashboard from "@/pages/dashboard";
import Investors from "@/pages/investors";
import Companies from "@/pages/companies";
import Communications from "@/pages/communications";
import Documents from "@/pages/documents";
import Reports from "@/pages/reports";
import Funds from "@/pages/funds";
import MeetingLogs from "@/pages/meeting-logs";
import NdrConferences from "@/pages/ndr-conferences";
import Scheduling from "@/pages/scheduling";
import Analysts from "@/pages/analysts";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/investors" component={Investors} />
        <Route path="/analysts" component={Analysts} />
        <Route path="/companies" component={Companies} />
        <Route path="/communications" component={Communications} />
        <Route path="/funds" component={Funds} />
        <Route path="/meeting-logs" component={MeetingLogs} />
        <Route path="/ndr-conferences" component={NdrConferences} />
        <Route path="/scheduling" component={Scheduling} />
        <Route path="/schedule" component={Scheduling} />
        <Route path="/documents" component={Documents} />
        <Route path="/reports" component={Reports} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
