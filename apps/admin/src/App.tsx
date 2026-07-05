import { Navigate, createBrowserRouter, RouterProvider, Outlet, useLocation } from "react-router";
import { AuthScreenState } from "./components/ui/medusa/auth-screen-state";
import { AdminShell } from "./components/layout/admin-shell";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import { CatalogProvider } from "./hooks/use-catalog";
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

const router = createBrowserRouter([
  { path: "/login", Component: LoginPage },
  { path: "/onboarding", Component: OnboardingPage },
  {
    Component: ProtectedRoute,
    children: [
      {
        Component: AdminShell,
        children: [
          { index: true, Component: () => <Navigate to="/orders" replace /> },
          { path: "orders", Component: OrdersListPage },
          { path: "orders/:orderNumber", Component: OrderDetailPage },
          { path: "products", Component: ProductsListPage },
          { path: "products/new", Component: CreateProductPage },
          { path: "products/:productId", Component: ProductDetailPage },
          { path: "products/:productId/customization", Component: ProductCustomizationEditor },
          { path: "collections", Component: CollectionsListPage },
          { path: "collections/:id", Component: CollectionDetailPage },
          { path: "categories", Component: CategoriesListPage },
          { path: "categories/:id", Component: CategoryDetailPage },
          {
            path: "inventory",
            Component: () => (
              <PlaceholderIndexPage
                eyebrow="Inventory"
                title="Inventory"
                description="Track stock locations, quantities, and replenishment workflows once inventory contracts move beyond mock data."
              />
            ),
          },
          {
            path: "customers",
            Component: () => (
              <PlaceholderIndexPage
                eyebrow="Customers"
                title="Customers"
                description="Review customer history, account status, and segments after the admin shell expands beyond operator-only flows."
              />
            ),
          },
          {
            path: "promotions",
            Component: () => (
              <PlaceholderIndexPage
                eyebrow="Promotions"
                title="Promotions"
                description="Manage discounts and campaign rules here once pricing logic is connected to live backend contracts."
              />
            ),
          },
          {
            path: "price-lists",
            Component: () => (
              <PlaceholderIndexPage
                eyebrow="Pricing"
                title="Price Lists"
                description="Configure channel-specific or customer-specific pricing here in a future merchandising iteration."
              />
            ),
          },
          { path: "team", Component: TeamPage },
          { path: "settings", Component: () => <Navigate to="/settings/security" replace /> },
          { path: "settings/security", Component: SecurityPage },
          { path: "customization-templates/*", Component: CustomizationTemplatesRouter },
          { path: "brand-assets", Component: BrandAssetsPage },
        ],
      },
    ],
  },
  { path: "*", Component: () => <Navigate to="/orders" replace /> },
]);

function App() {
  return (
    <AuthProvider>
      <CatalogProvider>
        <RouterProvider router={router} />
      </CatalogProvider>
    </AuthProvider>
  );
}

export default App;
