import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Layout } from "@/components/layout";
import NotFound from "@/pages/not-found";

// Pages
import Login from "@/pages/login";
import Register from "@/pages/register";
import ForgotPassword from "@/pages/forgot-password";
import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import NewClient from "@/pages/clients/new";
import ClientDetail from "@/pages/clients/[id]";
import QrCampaigns from "@/pages/qr-campaigns";
import Reviews from "@/pages/reviews";
import Feedback from "@/pages/feedback";
import Billing from "@/pages/billing";
import Analytics from "@/pages/analytics";
import Notifications from "@/pages/notifications";
import AuditLogs from "@/pages/audit-logs";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Profile from "@/pages/profile";
import PublicReviewFlow from "@/pages/review/[qrCode]";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ component: Component, ...rest }: any) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return (
    <Layout>
      <Component {...rest} />
    </Layout>
  );
};

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      
      {/* Public Review Flow */}
      <Route path="/review/:qrCode" component={PublicReviewFlow} />
      
      {/* Protected Routes */}
      <Route path="/dashboard"><ProtectedRoute component={Dashboard} /></Route>
      
      <Route path="/clients/new"><ProtectedRoute component={NewClient} /></Route>
      <Route path="/clients/:id"><ProtectedRoute component={ClientDetail} /></Route>
      <Route path="/clients"><ProtectedRoute component={Clients} /></Route>
      
      <Route path="/qr-campaigns"><ProtectedRoute component={QrCampaigns} /></Route>
      <Route path="/reviews"><ProtectedRoute component={Reviews} /></Route>
      <Route path="/feedback"><ProtectedRoute component={Feedback} /></Route>
      <Route path="/billing"><ProtectedRoute component={Billing} /></Route>
      <Route path="/analytics"><ProtectedRoute component={Analytics} /></Route>
      <Route path="/notifications"><ProtectedRoute component={Notifications} /></Route>
      <Route path="/audit-logs"><ProtectedRoute component={AuditLogs} /></Route>
      <Route path="/settings"><ProtectedRoute component={Settings} /></Route>
      <Route path="/users"><ProtectedRoute component={Users} /></Route>
      <Route path="/profile"><ProtectedRoute component={Profile} /></Route>
      
      <Route path="/"><Redirect to="/dashboard" /></Route>
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
