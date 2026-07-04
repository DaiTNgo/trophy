import { Navigate, Route, BrowserRouter, Routes, Outlet, useLocation } from "react-router";
import { AuthScreenState } from "./components/ui/medusa/auth-screen-state";
import { AdminShell } from "./components/layout/admin-shell";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { CatalogProvider } from "./hooks/use-catalog";
import { OrderProvider } from "./hooks/use-orders";
import { LoginPage } from "./pages/login";
import { OnboardingPage } from "./pages/onboarding";
import { TeamPage } from "./pages/team";
import { SecurityPage } from "./pages/security";
import { OrdersListPage } from "./pages/orders-list";
import { OrderDetailPage } from "./pages/order-detail";
import { ProductsListPage } from "./pages/products-list";
import { CreateProductPage } from "./pages/create-product";
import { ProductDetailPage } from "./pages/product-detail";
import { ProductCustomizationEditor } from "./pages/product-customization-editor";
import { CollectionsListPage } from "./pages/collections/index";
import { CollectionDetailPage } from "./pages/collections/detail";
import { CategoriesListPage } from "./pages/categories/index";
import { CategoryDetailPage } from "./pages/categories/detail";
import { PlaceholderIndexPage } from "./pages/placeholder-index";
import { CustomizationTemplatesRouter } from "./pages/customization-templates";
import { BrandAssetsPage } from "./pages/brand-assets";

function ProtectedRoute() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return <AuthScreenState title="Loading session" description="Checking your admin access." />;
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <CatalogProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/onboarding" element={<OnboardingPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminShell />}>
                  <Route index element={<Navigate to="/orders" replace />} />
                  <Route path="/orders" element={<OrdersListPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/products" element={<ProductsListPage />} />
                  <Route path="/products/new" element={<CreateProductPage />} />
                  <Route path="/products/:productId" element={<ProductDetailPage />} />
                  <Route path="/products/:productId/customization" element={<ProductCustomizationEditor />} />
                  <Route path="/collections" element={<CollectionsListPage />} />
                  <Route path="/collections/:id" element={<CollectionDetailPage />} />
                  <Route path="/categories" element={<CategoriesListPage />} />
                  <Route path="/categories/:id" element={<CategoryDetailPage />} />
                  <Route
                    path="/inventory"
                    element={
                      <PlaceholderIndexPage
                        eyebrow="Inventory"
                        title="Inventory"
                        description="Track stock locations, quantities, and replenishment workflows once inventory contracts move beyond mock data."
                      />
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <PlaceholderIndexPage
                        eyebrow="Customers"
                        title="Customers"
                        description="Review customer history, account status, and segments after the admin shell expands beyond operator-only flows."
                      />
                    }
                  />
                  <Route
                    path="/promotions"
                    element={
                      <PlaceholderIndexPage
                        eyebrow="Promotions"
                        title="Promotions"
                        description="Manage discounts and campaign rules here once pricing logic is connected to live backend contracts."
                      />
                    }
                  />
                  <Route
                    path="/price-lists"
                    element={
                      <PlaceholderIndexPage
                        eyebrow="Pricing"
                        title="Price Lists"
                        description="Configure channel-specific or customer-specific pricing here in a future merchandising iteration."
                      />
                    }
                  />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/settings" element={<Navigate to="/settings/security" replace />} />
                  <Route path="/settings/security" element={<SecurityPage />} />
                  <Route path="/customization-templates/*" element={<CustomizationTemplatesRouter />} />
                  <Route path="/brand-assets" element={<BrandAssetsPage />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/orders" replace />} />
            </Routes>
          </BrowserRouter>
        </CatalogProvider>
      </OrderProvider>
    </AuthProvider>
  );
}

export default App;
