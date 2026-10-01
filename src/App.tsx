import React, { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { PageLoader } from "@/components/PageLoader";
import { queryClient } from "@/lib/queryClient";
import { ThemeProvider } from "next-themes";
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenReloaded = sessionStorage.getItem("page_reloaded_for_chunk");
    try {
      const component = await componentImport();
      sessionStorage.removeItem("page_reloaded_for_chunk");
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenReloaded) {
        sessionStorage.setItem("page_reloaded_for_chunk", "true");
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });

// Lazy load de páginas con autorrecarga si cambia la versión desplegada
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const POS = lazyWithRetry(() => import("./pages/POS"));
const Inventory = lazyWithRetry(() => import("./pages/Inventory"));
const Customers = lazyWithRetry(() => import("./pages/Customers"));
const CustomerDashboard = lazyWithRetry(() => import("./pages/CustomerDashboard"));
const Reports = lazyWithRetry(() => import("./pages/Reports"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Users = lazyWithRetry(() => import("./pages/Users"));
const AccessCodes = lazyWithRetry(() => import("./pages/AccessCodes"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const CreateTestUsers = lazyWithRetry(() => import("./pages/CreateTestUsers"));
const InstallPWA = lazyWithRetry(() => import("./pages/InstallPWA"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (adminOnly && role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/setup" element={<CreateTestUsers />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-subtle">
      {/* Sidebar - oculto en móvil, visible en md+ */}
      <div className="hidden md:block">
        <Navigation />
      </div>
      
      {/* Main content con padding responsive */}
      <main className="flex-1 w-full md:ml-64 p-4 md:p-6 lg:p-8">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/auth" element={<Navigate to="/" replace />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/pos" element={<ProtectedRoute><POS /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
            <Route path="/customer-dashboard" element={<ProtectedRoute><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
            <Route path="/install" element={<ProtectedRoute><InstallPWA /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute adminOnly><Users /></ProtectedRoute>} />
            <Route path="/access-codes" element={<ProtectedRoute adminOnly><AccessCodes /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      {/* Mobile bottom navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border p-2 z-50">
        <Navigation />
      </div>
    </div>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
