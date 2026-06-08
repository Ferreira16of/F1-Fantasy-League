import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import NotFound from "@/pages/not-found";

// Pages
import Home from "@/pages/home";
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import Standings from "@/pages/standings";
import Friends from "@/pages/friends";
import Profile from "@/pages/profile";
import Leagues from "@/pages/leagues";
import NewLeague from "@/pages/leagues/new";
import LeagueDetail from "@/pages/leagues/[id]";
import DraftPage from "@/pages/draft/[gpId]";
import DraftResultsPage from "@/pages/draft/[gpId]/results";

// Admin Pages
import AdminDashboard from "@/pages/admin/index";
import AdminGPs from "@/pages/admin/gps";
import AdminDrivers from "@/pages/admin/drivers";
import AdminTeams from "@/pages/admin/teams";
import AdminScoring from "@/pages/admin/scoring";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!user) {
    return <Login />;
  }

  if (adminOnly && !user.isAdmin) {
    return <NotFound />;
  }

  return (
    <AppLayout>
      <Component />
    </AppLayout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      <Route path="/standings"><ProtectedRoute component={Standings} /></Route>
      <Route path="/friends"><ProtectedRoute component={Friends} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      
      <Route path="/leagues"><ProtectedRoute component={Leagues} /></Route>
      <Route path="/leagues/new"><ProtectedRoute component={NewLeague} /></Route>
      <Route path="/leagues/:id"><ProtectedRoute component={LeagueDetail} /></Route>
      
      <Route path="/draft/:gpId"><ProtectedRoute component={DraftPage} /></Route>
      <Route path="/draft/:gpId/results"><ProtectedRoute component={DraftResultsPage} /></Route>
      
      {/* Admin routes */}
      <Route path="/admin"><ProtectedRoute component={AdminDashboard} adminOnly /></Route>
      <Route path="/admin/gps"><ProtectedRoute component={AdminGPs} adminOnly /></Route>
      <Route path="/admin/drivers"><ProtectedRoute component={AdminDrivers} adminOnly /></Route>
      <Route path="/admin/teams"><ProtectedRoute component={AdminTeams} adminOnly /></Route>
      <Route path="/admin/scoring"><ProtectedRoute component={AdminScoring} adminOnly /></Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
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
