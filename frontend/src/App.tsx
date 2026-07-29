import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Dashboard from "@/pages/dashboard";
import Groups from "@/pages/groups";
import GroupDetail from "@/pages/groups/detail";
import NewExpense from "@/pages/groups/expense-new";
import DebtGraph from "@/pages/groups/debt-graph";
import PersonalTracker from "@/pages/personal";
import RecurringExpenses from "@/pages/groups/recurring";
import Profile from "@/pages/profile";
import DocsIndex from "@/pages/docs";
import DocsArchitecture from "@/pages/docs/architecture";
import DocsJwt from "@/pages/docs/jwt";
import DocsSecurity from "@/pages/docs/security";
import DocsAlgorithm from "@/pages/docs/algorithm";
import DocsCaching from "@/pages/docs/caching";
import DocsDatabase from "@/pages/docs/database";
import DocsEmail from "@/pages/docs/email";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/login">
        <GuestRoute><Login /></GuestRoute>
      </Route>
      <Route path="/register">
        <GuestRoute><Register /></GuestRoute>
      </Route>
      <Route path="/">
        <ProtectedRoute><Dashboard /></ProtectedRoute>
      </Route>
      <Route path="/groups">
        <ProtectedRoute><Groups /></ProtectedRoute>
      </Route>
      <Route path="/groups/:groupId">
        {(params) => <ProtectedRoute><GroupDetail groupId={Number(params.groupId)} /></ProtectedRoute>}
      </Route>
      <Route path="/groups/:groupId/expenses/new">
        {(params) => <ProtectedRoute><NewExpense groupId={Number(params.groupId)} /></ProtectedRoute>}
      </Route>
      <Route path="/groups/:groupId/debt-graph">
        {(params) => <ProtectedRoute><DebtGraph groupId={Number(params.groupId)} /></ProtectedRoute>}
      </Route>
      <Route path="/groups/:groupId/recurring">
        {(params) => <ProtectedRoute><RecurringExpenses groupId={Number(params.groupId)} /></ProtectedRoute>}
      </Route>
      <Route path="/personal">
        <ProtectedRoute><PersonalTracker /></ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute><Profile /></ProtectedRoute>
      </Route>

      {/* Docs Routes */}
      <Route path="/docs">
        <ProtectedRoute><DocsIndex /></ProtectedRoute>
      </Route>
      <Route path="/docs/architecture">
        <ProtectedRoute><DocsArchitecture /></ProtectedRoute>
      </Route>
      <Route path="/docs/jwt">
        <ProtectedRoute><DocsJwt /></ProtectedRoute>
      </Route>
      <Route path="/docs/security">
        <ProtectedRoute><DocsSecurity /></ProtectedRoute>
      </Route>
      <Route path="/docs/algorithm">
        <ProtectedRoute><DocsAlgorithm /></ProtectedRoute>
      </Route>
      <Route path="/docs/caching">
        <ProtectedRoute><DocsCaching /></ProtectedRoute>
      </Route>
      <Route path="/docs/database">
        <ProtectedRoute><DocsDatabase /></ProtectedRoute>
      </Route>
      <Route path="/docs/email">
        <ProtectedRoute><DocsEmail /></ProtectedRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={(import.meta.env.BASE_URL || "/").replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
