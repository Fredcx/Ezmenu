import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TitleUpdater } from "@/components/TitleUpdater";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { AdminLogin } from "./components/admin/AdminLogin";
import { AdminLayout } from "./components/admin/AdminLayout";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { AdminTables } from "./components/admin/AdminTables";
import { AdminKitchen } from "./components/admin/AdminKitchen";
import { AdminMenu } from "./components/admin/AdminMenu";
import { AdminInventory } from "@/components/admin/AdminInventory";
import { AdminRecipes } from "./components/admin/AdminRecipes";
import { AdminConsumption } from "./components/admin/AdminConsumption";
import { AdminDiscovery } from "./components/admin/AdminDiscovery";
import { AdminCategories } from "./components/admin/AdminCategories";
import { AdminQueue } from "./components/admin/AdminQueue";
import { AdminMenuPreview } from "./components/admin/AdminMenuPreview";
import { MenuProvider } from "./contexts/MenuContext";
import { InventoryProvider } from "./contexts/InventoryContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { LanguageProvider } from "./contexts/LanguageContext";
import { SuperAdminDashboard } from "./components/admin/SuperAdminDashboard";
import { SuperAdminEstablishments } from "./components/admin/SuperAdminEstablishments";
import { LoginScreen } from './pages/LoginScreen';
import { SuperAdminLogin } from "./components/admin/SuperAdminLogin";
import { SuperAdminCustomers } from "./components/admin/SuperAdminCustomers";
import { SuperAdminReports } from "./components/admin/SuperAdminReports";
import { SuperAdminUsers } from "./components/admin/SuperAdminUsers";
import { AdminHistory } from "./components/admin/AdminHistory";
import DesignTest from "./pages/DesignTest";
import { OrderProvider } from "./contexts/OrderContext";
import { PaymentWrapper } from "./components/PaymentWrapper";
import { AdminStaff } from "./components/admin/AdminStaff";
import { StaffDashboard } from "./components/admin/StaffDashboard";
import { StaffLogin } from './components/admin/StaffLogin';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <SonnerToaster position="top-center" richColors closeButton />
      <BrowserRouter>
        <TitleUpdater />
        <LanguageProvider>
          <MenuProvider>
            <InventoryProvider>
              <Routes>
                {/* 1. Platform Discovery (Home) */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginScreen />} />

                {/* 2. Super Admin (Global Platform) */}
                <Route path="/superadmin/login" element={<SuperAdminLogin />} />
                <Route path="/superadmin" element={<AdminLayout />}>
                  <Route index element={<SuperAdminDashboard />} />
                  <Route path="establishments" element={<SuperAdminEstablishments />} />
                  <Route path="customers" element={<SuperAdminUsers />} />
                </Route>

                {/* 3. Restaurant Admin (Store Specific) */}
                <Route path="/:slug/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="tables" element={<AdminTables />} />
                  <Route path="kitchen" element={<AdminKitchen />} />
                  <Route path="inventory" element={<AdminInventory />} />
                  <Route path="recipes" element={<AdminRecipes />} />
                  <Route path="menu" element={<AdminMenu />} />
                  <Route path="history" element={<AdminHistory />} />
                  <Route path="consumption" element={<AdminConsumption />} />
                  <Route path="discovery" element={<AdminDiscovery />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="staff" element={<AdminStaff />} />
                  <Route path="preview" element={<AdminMenuPreview />} />
                  <Route path="queue" element={<AdminQueue />} />
                </Route>

                {/* 4. Waiter/Staff Portal */}
                <Route path="/equipe/login" element={<StaffLogin />} />
                <Route path="/equipe" element={<StaffLogin />} />
                <Route path="/:slug/equipe" element={<StaffDashboard />} />

                {/* 5. Restaurant Access (Consumer) */}
                <Route path="/:slug" element={<Index />} />
                <Route path="/:slug/:categorySlug" element={<Index />} />

                {/* Standard Admin Login (Optional redirect or global login) */}
                <Route path="/admin" element={<AdminLogin />} />

                <Route path="/design-test" element={<DesignTest />} />
                <Route path="/:slug/design-test" element={<DesignTest />} />
                <Route path="/:slug/teste-pagamento" element={<OrderProvider><PaymentWrapper onBack={() => window.history.back()} /></OrderProvider>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </InventoryProvider>
          </MenuProvider>
        </LanguageProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
