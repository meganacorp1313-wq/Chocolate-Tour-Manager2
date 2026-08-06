import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { I18nProvider } from '@/lib/i18n';

import Home from '@/pages/public/Home';
import BookingConfirmation from '@/pages/public/BookingConfirmation';
import PartnerApp from '@/pages/partner/PartnerApp';
import AdminApp from '@/pages/admin/AdminApp';

const queryClient = new QueryClient();

function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="text-center">
        <h1 className="text-4xl font-serif font-bold text-primary mb-2">
          404
        </h1>
        <p className="text-muted-foreground">
          Not Found
        </p>
        <a href="/" className="inline-block mt-4 text-primary hover:underline">
          Go Home
        </a>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      {/* Public */}
      <Route path="/" component={Home} />
      <Route path="/booking/:code" component={BookingConfirmation} />
      
      {/* Partner B2B */}
      <Route path="/partner" component={PartnerApp} />
      
      {/* Admin Panel (has its own inner router) */}
      <Route path="/admin" component={AdminApp} />
      <Route path="/admin/*" component={AdminApp} />

      {/* Fallback */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
      </QueryClientProvider>
    </I18nProvider>
  );
}

export default App;
