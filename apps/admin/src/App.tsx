import {
  createContext,
  startTransition,
  useContext,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  BrowserRouter,
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router";
import * as v from "valibot";
import CustomizationTemplateListPage from "./CustomizationTemplateListPage";
import CustomizationTemplatePage from "./CustomizationTemplatePage";
import { authClient, bootstrapFirstAdmin, getBootstrapStatus } from "./lib/auth-client";

type AuthUser = {
  id: string;
  username?: string | null;
  name: string;
  role?: string | null;
  banned?: boolean | null;
};

type AuthContextValue = {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<{ ok: true } | { ok: false; message: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ ok: true } | { ok: false; message: string }>;
};

type OrderContextValue = {
  orders: Order[];
  runOrderAction: (orderId: string, action: "capture" | "fulfill" | "cancel") => Order | null;
};

type CatalogContextValue = {
  products: CatalogProduct[];
  createProduct: (input: CreateProductSubmission) => CatalogProduct;
  updateProduct: (productId: string, updater: (product: CatalogProduct) => CatalogProduct) => CatalogProduct | null;
};

type OrderStatus = "Pending" | "Processing" | "Fulfilled" | "Canceled";
type ProductStatus = "Published" | "Draft" | "Low stock";

type Order = {
  id: string;
  customer: string;
  status: OrderStatus;
  total: number;
  items: number;
  date: string;
  channel: string;
  email: string;
  paymentStatus: "Authorized" | "Captured" | "Refunded" | "Canceled";
  fulfillmentStatus: "Unfulfilled" | "Partially fulfilled" | "Fulfilled" | "Canceled";
  shippingAddress: string;
  billingAddress: string;
  paymentMethod: string;
  lineItems: Array<{ title: string; quantity: number; unitPrice: number; variant: string }>;
  timeline: Array<{ at: string; title: string; detail: string }>;
};

type CatalogProduct = {
  id: string;
  title: string;
  handle: string;
  subtitle: string;
  description: string;
  status: ProductStatus;
  inventory: number;
  price: number;
  category: string;
  collection: string;
  type: string;
  categories: string[];
  tags: string[];
  media: string[];
  attributes: ProductAttribute[];
  variants: ProductVariant[];
  updatedAt: string;
};

type ProductVariant = {
  id: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  options: VariantOptionValue[];
};

type VariantOptionValue = {
  option: string;
  value: string;
};

type ProductAttribute = {
  key: string;
  value: string;
};

type CreateProductFormValues = {
  title: string;
  handle: string;
  subtitle: string;
  description: string;
  type: string;
  collection: string;
  categories: string[];
  tags: string;
  media: string;
  basePrice: string;
  inventory: string;
  optionNameOne: string;
  optionValuesOne: string;
  optionNameTwo: string;
  optionValuesTwo: string;
};

type CreateProductSubmission = {
  mode: "draft" | "publish";
  values: CreateProductFormValues;
  attributes: ProductAttribute[];
};

type LoginFormValues = {
  username: string;
  password: string;
};

type LoginFormErrors = Partial<Record<keyof LoginFormValues | "form", string>>;

type BootstrapFormValues = {
  username: string;
  password: string;
  bootstrapSecret: string;
};

type BootstrapFormErrors = Partial<Record<keyof BootstrapFormValues | "form", string>>;

type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

type ChangePasswordFormErrors = Partial<Record<keyof ChangePasswordFormValues | "form", string>>;

type AdminUserRecord = {
  id: string;
  username?: string | null;
  name: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
};

type TeamInviteFormValues = {
  username: string;
  password: string;
};

type TeamInviteFormErrors = Partial<Record<keyof TeamInviteFormValues | "form", string>>;

type CreateProductErrors = Partial<
  Record<
    | keyof CreateProductFormValues
    | "attributes"
    | "publish"
    | "variants"
    | "form",
    string
  >
>;

const CATALOG_STORAGE_KEY = "trophy-admin-catalog";

const collectionOptions = ["Summer Drop", "Core Essentials", "Travel Edit", "Editorial Spotlight"];
const categoryOptions = ["Outerwear", "Tops", "Accessories", "Knitwear", "Headwear", "Footwear"];
const typeOptions = ["Merchandise", "Apparel", "Accessory", "Lifestyle"];

function buildAdminEmail(username: string) {
  return `${username.trim().toLowerCase()}@admin.trophy.local`;
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

const loginSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty("Username is required."), v.minLength(3, "Username must be at least 3 characters.")),
  password: v.pipe(v.string(), v.nonEmpty("Password is required."), v.minLength(8, "Password must be at least 8 characters.")),
});

const bootstrapSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty("Username is required."), v.minLength(3, "Username must be at least 3 characters.")),
  password: v.pipe(v.string(), v.nonEmpty("Password is required."), v.minLength(8, "Password must be at least 8 characters.")),
  bootstrapSecret: v.pipe(v.string(), v.nonEmpty("Bootstrap secret is required.")),
});

const changePasswordSchema = v.object({
  currentPassword: v.pipe(v.string(), v.nonEmpty("Current password is required.")),
  newPassword: v.pipe(v.string(), v.nonEmpty("New password is required."), v.minLength(8, "Password must be at least 8 characters.")),
  confirmPassword: v.pipe(v.string(), v.nonEmpty("Confirm your new password.")),
});

const teamInviteSchema = v.object({
  username: v.pipe(v.string(), v.trim(), v.nonEmpty("Username is required."), v.minLength(3, "Username must be at least 3 characters.")),
  password: v.pipe(v.string(), v.nonEmpty("Temporary password is required."), v.minLength(8, "Password must be at least 8 characters.")),
});

const createProductSchema = v.object({
  title: v.pipe(v.string(), v.trim(), v.nonEmpty("Title is required.")),
  handle: v.optional(
    v.pipe(
      v.string(),
      v.trim(),
      v.regex(/^[a-z0-9-]*$/, "Handle can only contain lowercase letters, numbers, and hyphens."),
    ),
  ),
  basePrice: v.optional(v.string()),
});

const authContext = createContext<AuthContextValue | null>(null);
const orderContext = createContext<OrderContextValue | null>(null);
const catalogContext = createContext<CatalogContextValue | null>(null);

const initialOrders: Order[] = [
  {
    id: "#1001",
    customer: "Lena Howard",
    status: "Pending",
    total: 124,
    items: 3,
    date: "2026-06-21",
    channel: "Web",
    email: "lena@example.com",
    paymentStatus: "Authorized",
    fulfillmentStatus: "Unfulfilled",
    shippingAddress: "120 Hudson St, New York, NY 10013",
    billingAddress: "120 Hudson St, New York, NY 10013",
    paymentMethod: "Visa ending in 4242",
    lineItems: [
      { title: "Core Box Tee", quantity: 2, unitPrice: 28, variant: "Black / M" },
      { title: "Signature Field Cap", quantity: 1, unitPrice: 32, variant: "Olive" },
    ],
    timeline: [
      { at: "2026-06-21 09:14", title: "Order placed", detail: "Customer completed checkout on web storefront." },
      { at: "2026-06-21 09:17", title: "Payment authorized", detail: "Card authorization approved and awaiting capture." },
    ],
  },
  {
    id: "#1002",
    customer: "Marcus Chen",
    status: "Processing",
    total: 248,
    items: 5,
    date: "2026-06-21",
    channel: "Draft order",
    email: "marcus@example.com",
    paymentStatus: "Captured",
    fulfillmentStatus: "Partially fulfilled",
    shippingAddress: "14 Orchard Rd, Singapore 238825",
    billingAddress: "14 Orchard Rd, Singapore 238825",
    paymentMethod: "Manual invoice",
    lineItems: [
      { title: "Trophy Heavyweight Hoodie", quantity: 2, unitPrice: 68, variant: "Heather / L" },
      { title: "Core Box Tee", quantity: 3, unitPrice: 28, variant: "White / XL" },
    ],
    timeline: [
      { at: "2026-06-21 08:40", title: "Draft order created", detail: "Operator created draft order for wholesale customer." },
      { at: "2026-06-21 08:55", title: "Payment captured", detail: "Bank transfer marked as received." },
      { at: "2026-06-21 10:20", title: "Partial fulfillment", detail: "Two hoodie units handed to warehouse." },
    ],
  },
  {
    id: "#1003",
    customer: "Sofia Tran",
    status: "Fulfilled",
    total: 86,
    items: 2,
    date: "2026-06-20",
    channel: "Web",
    email: "sofia@example.com",
    paymentStatus: "Captured",
    fulfillmentStatus: "Fulfilled",
    shippingAddress: "93 Le Loi, Ho Chi Minh City",
    billingAddress: "93 Le Loi, Ho Chi Minh City",
    paymentMethod: "Mastercard ending in 1188",
    lineItems: [{ title: "Merino Travel Crew", quantity: 1, unitPrice: 54, variant: "Navy / M" }, { title: "Signature Field Cap", quantity: 1, unitPrice: 32, variant: "Black" }],
    timeline: [
      { at: "2026-06-20 13:15", title: "Order placed", detail: "Customer completed checkout." },
      { at: "2026-06-20 13:20", title: "Payment captured", detail: "Payment settled immediately." },
      { at: "2026-06-20 17:40", title: "Fulfilled", detail: "Shipment handed to carrier." },
    ],
  },
  {
    id: "#1004",
    customer: "Noah Rivera",
    status: "Canceled",
    total: 159,
    items: 4,
    date: "2026-06-20",
    channel: "Manual",
    email: "noah@example.com",
    paymentStatus: "Canceled",
    fulfillmentStatus: "Canceled",
    shippingAddress: "55 Market St, San Francisco, CA 94105",
    billingAddress: "55 Market St, San Francisco, CA 94105",
    paymentMethod: "Invoice canceled",
    lineItems: [{ title: "Canvas Utility Tote", quantity: 4, unitPrice: 24, variant: "Default" }],
    timeline: [
      { at: "2026-06-20 12:00", title: "Order created", detail: "Manual order created by support." },
      { at: "2026-06-20 14:10", title: "Order canceled", detail: "Customer changed requirements before capture." },
    ],
  },
  {
    id: "#1005",
    customer: "Avery Patel",
    status: "Processing",
    total: 412,
    items: 8,
    date: "2026-06-19",
    channel: "Web",
    email: "avery@example.com",
    paymentStatus: "Captured",
    fulfillmentStatus: "Partially fulfilled",
    shippingAddress: "22 Connaught Pl, New Delhi 110001",
    billingAddress: "22 Connaught Pl, New Delhi 110001",
    paymentMethod: "Amex ending in 2001",
    lineItems: [{ title: "Trophy Heavyweight Hoodie", quantity: 4, unitPrice: 68, variant: "Stone / L" }, { title: "Core Box Tee", quantity: 4, unitPrice: 28, variant: "Black / L" }],
    timeline: [
      { at: "2026-06-19 16:45", title: "Order placed", detail: "Customer completed checkout." },
      { at: "2026-06-19 16:50", title: "Payment captured", detail: "Charge settled." },
      { at: "2026-06-20 09:10", title: "Partial fulfillment", detail: "Warehouse packed half the line items." },
    ],
  },
  {
    id: "#1006",
    customer: "Ivy Nguyen",
    status: "Fulfilled",
    total: 74,
    items: 1,
    date: "2026-06-18",
    channel: "Instagram",
    email: "ivy@example.com",
    paymentStatus: "Captured",
    fulfillmentStatus: "Fulfilled",
    shippingAddress: "7 Tran Hung Dao, Da Nang",
    billingAddress: "7 Tran Hung Dao, Da Nang",
    paymentMethod: "Manual payment link",
    lineItems: [{ title: "Merino Travel Crew", quantity: 1, unitPrice: 54, variant: "Charcoal / M" }],
    timeline: [
      { at: "2026-06-18 11:05", title: "Manual order created", detail: "Social commerce order entered by operator." },
      { at: "2026-06-18 11:20", title: "Payment captured", detail: "Payment link settled." },
      { at: "2026-06-18 15:05", title: "Fulfilled", detail: "Package dispatched." },
    ],
  },
];

const initialProducts: CatalogProduct[] = [
  {
    id: "prod_hoodie",
    title: "Trophy Heavyweight Hoodie",
    handle: "trophy-heavyweight-hoodie",
    subtitle: "Signature seasonal fleece",
    description: "Heavyweight brushed fleece hoodie for editorial drops.",
    status: "Published",
    inventory: 48,
    price: 68,
    category: "Outerwear",
    collection: "Core Essentials",
    type: "Apparel",
    categories: ["Outerwear"],
    tags: ["hoodie", "core"],
    media: [],
    attributes: [{ key: "Fabric", value: "430gsm cotton blend" }],
    variants: [
      {
        id: "var_hoodie_default",
        title: "Default variant",
        sku: "TR-HOODIE-001",
        price: 68,
        inventory: 48,
        options: [],
      },
    ],
    updatedAt: "2026-06-21",
  },
  {
    id: "prod_cap",
    title: "Signature Field Cap",
    handle: "signature-field-cap",
    subtitle: "Low-profile six-panel cap",
    description: "Cotton twill cap with stitched emblem.",
    status: "Low stock",
    inventory: 6,
    price: 32,
    category: "Accessories",
    collection: "Travel Edit",
    type: "Accessory",
    categories: ["Accessories", "Headwear"],
    tags: ["cap"],
    media: [],
    attributes: [{ key: "Closure", value: "Adjustable strap" }],
    variants: [
      {
        id: "var_cap_default",
        title: "Default variant",
        sku: "TR-CAP-001",
        price: 32,
        inventory: 6,
        options: [],
      },
    ],
    updatedAt: "2026-06-21",
  },
  {
    id: "prod_shirt",
    title: "Core Box Tee",
    handle: "core-box-tee",
    subtitle: "Relaxed staple tee",
    description: "Structured cotton jersey tee with broad fit.",
    status: "Published",
    inventory: 124,
    price: 28,
    category: "Tops",
    collection: "Core Essentials",
    type: "Apparel",
    categories: ["Tops"],
    tags: ["tee"],
    media: [],
    attributes: [{ key: "Fit", value: "Relaxed" }],
    variants: [
      {
        id: "var_shirt_default",
        title: "Default variant",
        sku: "TR-TEE-001",
        price: 28,
        inventory: 124,
        options: [],
      },
    ],
    updatedAt: "2026-06-20",
  },
  {
    id: "prod_tote",
    title: "Canvas Utility Tote",
    handle: "canvas-utility-tote",
    subtitle: "Merchandising prototype",
    description: "Draft carry-all for upcoming release.",
    status: "Draft",
    inventory: 0,
    price: 24,
    category: "Accessories",
    collection: "Editorial Spotlight",
    type: "Lifestyle",
    categories: ["Accessories"],
    tags: ["tote", "draft"],
    media: [],
    attributes: [{ key: "Capacity", value: "18L" }],
    variants: [
      {
        id: "var_tote_default",
        title: "Default variant",
        sku: "TR-TOTE-001",
        price: 24,
        inventory: 0,
        options: [],
      },
    ],
    updatedAt: "2026-06-19",
  },
  {
    id: "prod_crew",
    title: "Merino Travel Crew",
    handle: "merino-travel-crew",
    subtitle: "Light knit layer",
    description: "Travel-ready knitwear with packable warmth.",
    status: "Published",
    inventory: 22,
    price: 54,
    category: "Knitwear",
    collection: "Travel Edit",
    type: "Apparel",
    categories: ["Knitwear"],
    tags: ["crewneck"],
    media: [],
    attributes: [{ key: "Material", value: "Merino wool blend" }],
    variants: [
      {
        id: "var_crew_default",
        title: "Default variant",
        sku: "TR-CREW-001",
        price: 54,
        inventory: 22,
        options: [],
      },
    ],
    updatedAt: "2026-06-18",
  },
];

const defaultCreateProductValues: CreateProductFormValues = {
  title: "",
  handle: "",
  subtitle: "",
  description: "",
  type: "",
  collection: "",
  categories: [],
  tags: "",
  media: "",
  basePrice: "",
  inventory: "",
  optionNameOne: "",
  optionValuesOne: "",
  optionNameTwo: "",
  optionValuesTwo: "",
};

function CustomizationTemplatesRouter() {
  const [searchParams] = useSearchParams();
  const edit = searchParams.get("edit");
  return edit ? <CustomizationTemplatePage /> : <CustomizationTemplateListPage />;
}

function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <CatalogProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route element={<ProtectedRoute />}>
                <Route element={<AdminShell />}>
                  <Route index element={<Navigate to="/orders" replace />} />
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/orders/:orderId" element={<OrderDetailPage />} />
                  <Route path="/products" element={<ProductsPage />} />
                  <Route path="/products/new" element={<CreateProductPage />} />
                  <Route path="/products/:productId" element={<ProductDetailPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/settings/security" element={<SecurityPage />} />
                  <Route path="/customization-templates" element={<CustomizationTemplatesRouter />} />
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

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function refreshSession() {
    const { data } = await authClient.getSession();
    const nextUser = data?.user;

    if (!nextUser || !hasAdminAccess(nextUser.role)) {
      setUser(null);
      return;
    }

    setUser({
      id: nextUser.id,
      username: nextUser.username ?? nextUser.email,
      name: nextUser.name,
      role: nextUser.role,
      banned: nextUser.banned,
    });
  }

  useEffect(() => {
    let active = true;

    async function loadSession() {
      try {
        const { data } = await authClient.getSession();
        if (!active) {
          return;
        }

        const nextUser = data?.user;
        if (!nextUser || !hasAdminAccess(nextUser.role)) {
          setUser(null);
          return;
        }

        setUser({
          id: nextUser.id,
          username: nextUser.username ?? nextUser.email,
          name: nextUser.name,
          role: nextUser.role,
          banned: nextUser.banned,
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void loadSession();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      isAuthenticated: user !== null,
      user,
      login: async (username, password) => {
        const { error } = await authClient.signIn.username({
          username: normalizeUsername(username),
          password,
          rememberMe: true,
        });

        if (error) {
          return {
            ok: false,
            message: getAuthErrorMessage(error, "Unable to sign in."),
          };
        }

        const { data } = await authClient.getSession();
        if (!hasAdminAccess(data?.user.role)) {
          await authClient.signOut();
          setUser(null);
          return {
            ok: false,
            message: "This account is not allowed to access the admin workspace.",
          };
        }

        await refreshSession();
        return { ok: true };
      },
      logout: async () => {
        await authClient.signOut();
        setUser(null);
      },
      refreshSession: async () => {
        await refreshSession();
      },
      changePassword: async (currentPassword, newPassword) => {
        const { error } = await authClient.changePassword({
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        });

        if (error) {
          return {
            ok: false,
            message: getAuthErrorMessage(error, "Unable to change password."),
          };
        }

        await refreshSession();
        return { ok: true };
      },
    }),
    [isLoading, user],
  );

  return <authContext.Provider value={value}>{children}</authContext.Provider>;
}

function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);

  useEffect(() => {
    const saved = window.localStorage.getItem(CATALOG_STORAGE_KEY);
    if (!saved) {
      return;
    }

    try {
      setProducts(JSON.parse(saved) as CatalogProduct[]);
    } catch {
      window.localStorage.removeItem(CATALOG_STORAGE_KEY);
    }
  }, []);

  const value = useMemo<CatalogContextValue>(
    () => ({
      products,
      createProduct: (input) => {
        const nextProduct = createMockProduct(products, input);
        const nextProducts = [nextProduct, ...products];
        setProducts(nextProducts);
        window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(nextProducts));
        return nextProduct;
      },
      updateProduct: (productId, updater) => {
        const currentProduct = products.find((product) => product.id === productId);
        if (!currentProduct) {
          return null;
        }

        const updatedProduct = updater(currentProduct);
        const nextProducts = products.map((product) => (product.id === productId ? updatedProduct : product));
        setProducts(nextProducts);
        window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(nextProducts));
        return updatedProduct;
      },
    }),
    [products],
  );

  return <catalogContext.Provider value={value}>{children}</catalogContext.Provider>;
}

function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);

  const value = useMemo<OrderContextValue>(
    () => ({
      orders,
      runOrderAction: (orderId, action) => {
        const currentOrder = orders.find((order) => order.id === orderId);
        if (!currentOrder) {
          return null;
        }

        const updatedOrder = applyOrderAction(currentOrder, action);
        const nextOrders = orders.map((order) => (order.id === orderId ? updatedOrder : order));
        setOrders(nextOrders);
        return updatedOrder;
      },
    }),
    [orders],
  );

  return <orderContext.Provider value={value}>{children}</orderContext.Provider>;
}

function useAuth() {
  const context = useContext(authContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

function useCatalog() {
  const context = useContext(catalogContext);
  if (!context) {
    throw new Error("useCatalog must be used within CatalogProvider.");
  }

  return context;
}

function useOrders() {
  const context = useContext(orderContext);
  if (!context) {
    throw new Error("useOrders must be used within OrderProvider.");
  }

  return context;
}

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

function AdminShell() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col lg:flex-row">
        <aside className="border-b border-stone-200 bg-[#0f172a] px-5 py-6 text-white lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:border-slate-800">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Trophy</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin</h1>
            </div>
            <button
              type="button"
              onClick={async () => {
                await auth.logout();
                navigate("/login", { replace: true });
              }}
              className="rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-500 hover:bg-slate-800"
            >
              Sign out
            </button>
          </div>

          <div className="mt-8 hidden rounded-3xl border border-slate-800 bg-slate-900/70 p-4 lg:block">
            <p className="text-sm text-slate-400">Signed in as</p>
            <p className="mt-1 font-medium text-white">{auth.user?.name}</p>
            <p className="text-sm text-slate-400">{auth.user?.username ?? auth.user?.name}</p>
          </div>

          <nav className="mt-6 flex gap-3 lg:mt-10 lg:flex-col">
            <SidebarLink to="/orders" label="Orders" description="Manage payment, fulfillment, and status." />
            <SidebarLink to="/products" label="Products" description="Control catalog, pricing, and stock." />
            {isSuperAdmin(auth.user?.role) ? (
              <SidebarLink to="/team" label="Team" description="Create, disable, and reset admin accounts." />
            ) : null}
            <SidebarLink to="/settings/security" label="Security" description="Change your password and keep access current." />
            <SidebarLink
              to="/customization-templates"
              label="Customization"
              description="Define cup zones and production rules."
            />
          </nav>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6 flex items-center justify-between rounded-[28px] border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <div>
              <p className="text-sm text-slate-500">Operations workspace</p>
              <p className="text-lg font-semibold tracking-tight">Medusa-style admin flow with server-enforced sessions</p>
            </div>
            <div className="hidden text-right sm:block">
              <p className="text-sm text-slate-500">Signed in role</p>
              <p className="font-mono text-sm text-slate-700">{auth.user?.role ?? "admin"}</p>
            </div>
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ to, label, description }: { to: string; label: string; description: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "rounded-3xl border p-4 text-left transition",
          isActive ? "border-amber-300 bg-amber-50 text-slate-950" : "border-slate-800 bg-slate-900/60 text-slate-200 hover:border-slate-700 hover:bg-slate-900",
        ].join(" ")
      }
    >
      <p className="text-base font-semibold">{label}</p>
      <p className="mt-1 text-sm leading-6 text-inherit/75">{description}</p>
    </NavLink>
  );
}

function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [values, setValues] = useState<LoginFormValues>({ username: "", password: "" });
  const [errors, setErrors] = useState<LoginFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasUsers, setHasUsers] = useState(true);
  const [bootstrapValues, setBootstrapValues] = useState<BootstrapFormValues>({
    username: "",
    password: "",
    bootstrapSecret: "",
  });
  const [bootstrapErrors, setBootstrapErrors] = useState<BootstrapFormErrors>({});
  const [bootstrapMessage, setBootstrapMessage] = useState<string | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(false);

  const destination = (location.state as { from?: string } | null)?.from ?? "/orders";

  useEffect(() => {
    let active = true;

    async function loadBootstrapStatus() {
      try {
        const result = await getBootstrapStatus();
        if (active) {
          setHasUsers(result.hasUsers);
        }
      } catch {
        if (active) {
          setHasUsers(true);
        }
      }
    }

    void loadBootstrapStatus();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate(destination, { replace: true });
    }
  }, [auth.isAuthenticated, destination, navigate]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateLogin(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const result = await auth.login(values.username, values.password);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }

    setErrors({});
    startTransition(() => {
      navigate(destination, { replace: true });
    });
  }

  async function handleBootstrap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateBootstrap(bootstrapValues);
    if (Object.keys(nextErrors).length > 0) {
      setBootstrapErrors(nextErrors);
      return;
    }

    setIsBootstrapping(true);
    setBootstrapMessage(null);

    try {
      await bootstrapFirstAdmin(bootstrapValues);
      setHasUsers(true);
      setValues({
        username: bootstrapValues.username,
        password: bootstrapValues.password,
      });
      setBootstrapErrors({});
      setBootstrapMessage("First admin account created. Sign in with the username and password you just set.");
    } catch (error) {
      setBootstrapErrors({
        form: error instanceof Error ? error.message : "Unable to create the first admin.",
      });
    } finally {
      setIsBootstrapping(false);
    }
  }

  if (auth.isLoading) {
    return <AuthScreenState title="Loading session" description="Checking your admin access." />;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#fef3c7,transparent_30%),linear-gradient(135deg,#0f172a,#1e293b_55%,#334155)] px-4 py-10 text-white">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/8 p-8 backdrop-blur sm:p-10">
          <p className="text-sm uppercase tracking-[0.35em] text-amber-200/80">Trophy Commerce</p>
          <h1 className="mt-5 max-w-xl text-5xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Admin pages for orders and products, built to move fast.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
            This round ships a protected admin surface with real login submission, local session state, and mock operational data for teams to iterate on before API integration.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <MetricCard label="Orders today" value="46" />
            <MetricCard label="Products live" value="128" />
            <MetricCard label="Conversion" value="3.9%" />
          </div>
        </section>

        <section className="rounded-[32px] bg-white p-8 text-slate-900 shadow-2xl shadow-slate-950/20 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.3em] text-slate-500">
                {hasUsers ? "Sign in" : "Bootstrap"}
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">
                {hasUsers ? "Admin login" : "Create the first admin"}
              </h2>
            </div>
            {hasUsers ? null : (
              <div className="rounded-2xl bg-stone-100 px-4 py-3 text-right text-sm text-slate-600">
                <p className="font-medium text-slate-700">Bootstrap flow</p>
                <p className="mt-1 max-w-48">
                  Create the first admin once, then the login form will be used for all later access.
                </p>
              </div>
            )}
          </div>

              {hasUsers ? (
            <form className="mt-8 space-y-5" onSubmit={handleSubmit} noValidate>
              <TextField
                label="Username"
                name="username"
                value={values.username}
                error={errors.username}
                onChange={(value) => setValues((current) => ({ ...current, username: value }))}
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={values.password}
                error={errors.password}
                onChange={(value) => setValues((current) => ({ ...current, password: value }))}
              />

              {errors.form ? <InlineError message={errors.form} /> : null}
              {bootstrapMessage ? <SuccessMessage message={bootstrapMessage} /> : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSubmitting ? "Signing in..." : "Sign in to admin"}
              </button>
            </form>
          ) : (
            <form className="mt-8 space-y-5" onSubmit={handleBootstrap} noValidate>
              <TextField
                label="Username"
                name="username"
                value={bootstrapValues.username}
                error={bootstrapErrors.username}
                onChange={(value) => setBootstrapValues((current) => ({ ...current, username: value }))}
              />
              <TextField
                label="Password"
                name="password"
                type="password"
                value={bootstrapValues.password}
                error={bootstrapErrors.password}
                onChange={(value) => setBootstrapValues((current) => ({ ...current, password: value }))}
              />
              <TextField
                label="Bootstrap secret"
                name="bootstrapSecret"
                type="password"
                value={bootstrapValues.bootstrapSecret}
                error={bootstrapErrors.bootstrapSecret}
                hint="In local development without ADMIN_BOOTSTRAP_SECRET, loopback requests accept trophy-local-bootstrap."
                onChange={(value) => setBootstrapValues((current) => ({ ...current, bootstrapSecret: value }))}
              />

              {bootstrapErrors.form ? <InlineError message={bootstrapErrors.form} /> : null}

              <button
                type="submit"
                disabled={isBootstrapping}
                className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isBootstrapping ? "Creating admin..." : "Create first admin"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}

function TeamPage() {
  const auth = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteValues, setInviteValues] = useState<TeamInviteFormValues>({
    username: "",
    password: "",
  });
  const [inviteErrors, setInviteErrors] = useState<TeamInviteFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resetPasswordByUserId, setResetPasswordByUserId] = useState<Record<string, string>>({});
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  if (!isSuperAdmin(auth.user?.role)) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Team"
          title="Restricted"
          description="Only super-admin accounts can create users, disable accounts, or reset someone else's password."
        />
        <SectionCard
          title="Super-admin only"
          description="Use a super-admin account for account lifecycle operations. Regular admins can still use the rest of the admin workspace."
        >
          <EmptyState message="This page is available only to super-admin accounts." />
        </SectionCard>
      </section>
    );
  }

  async function loadUsers() {
    setIsLoading(true);
    setError(null);

    const { data, error: nextError } = await authClient.admin.listUsers({
      query: {
        limit: 100,
        sortBy: "name",
        sortDirection: "asc",
      },
    });

    if (nextError) {
      setError(getAuthErrorMessage(nextError, "Unable to load admin accounts."));
      setIsLoading(false);
      return;
    }

    setUsers((data?.users ?? []) as AdminUserRecord[]);
    setIsLoading(false);
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateTeamInvite(inviteValues);
    if (Object.keys(nextErrors).length > 0) {
      setInviteErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setActionMessage(null);

    const { error: nextError } = await authClient.admin.createUser({
      email: buildAdminEmail(inviteValues.username),
      name: normalizeUsername(inviteValues.username),
      password: inviteValues.password,
      role: "admin",
      data: {
        username: normalizeUsername(inviteValues.username),
        displayUsername: normalizeUsername(inviteValues.username),
      },
    });

    setIsSubmitting(false);

    if (nextError) {
      setInviteErrors({
        form: getAuthErrorMessage(nextError, "Unable to create admin account."),
      });
      return;
    }

    setInviteErrors({});
    setInviteValues({ username: "", password: "" });
    setActionMessage("Admin account created.");
    await loadUsers();
  }

  async function handleBanToggle(account: AdminUserRecord) {
    setActionMessage(null);

    if (account.id === auth.user?.id) {
      setError("Use another admin account to disable this account.");
      return;
    }

    if (account.banned) {
      const { error: nextError } = await authClient.admin.unbanUser({
        userId: account.id,
      });

      if (nextError) {
        setError(getAuthErrorMessage(nextError, "Unable to reactivate this account."));
        return;
      }

      setActionMessage(`Reactivated ${account.username ?? account.name}.`);
    } else {
      const { error: nextError } = await authClient.admin.banUser({
        userId: account.id,
        banReason: "Disabled by admin",
      });

      if (nextError) {
        setError(getAuthErrorMessage(nextError, "Unable to disable this account."));
        return;
      }

      setActionMessage(`Disabled ${account.username ?? account.name} and revoked its sessions.`);
    }

    await loadUsers();
  }

  async function handleResetPassword(account: AdminUserRecord) {
    const nextPassword = resetPasswordByUserId[account.id]?.trim();
    if (!nextPassword || nextPassword.length < 8) {
      setError("Temporary passwords must be at least 8 characters.");
      return;
    }

    setActionMessage(null);
    const { error: nextError } = await authClient.admin.setUserPassword({
      userId: account.id,
      newPassword: nextPassword,
    });

    if (nextError) {
      setError(getAuthErrorMessage(nextError, "Unable to reset this password."));
      return;
    }

    const revokeResult = await authClient.admin.revokeUserSessions({
      userId: account.id,
    });

    if (revokeResult.error) {
      setError(getAuthErrorMessage(revokeResult.error, "Password changed, but session revocation failed."));
      return;
    }

    setResetPasswordByUserId((current) => ({ ...current, [account.id]: "" }));
    setActionMessage(`Password reset for ${account.username ?? account.name}. Existing sessions were revoked.`);
    await loadUsers();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Team"
        title="Admin access"
        description="Create admin accounts, disable people who should no longer access the workspace, and reset passwords manually."
      />

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          title="Add admin"
          description="Create a regular admin account with a username and temporary password. The bootstrap flow is reserved for the first super-admin."
        >
          <form className="space-y-4" onSubmit={handleCreateUser} noValidate>
            <TextField
              label="Username"
              name="team-username"
              value={inviteValues.username}
              error={inviteErrors.username}
              onChange={(value) => setInviteValues((current) => ({ ...current, username: value }))}
            />
            <TextField
              label="Temporary password"
              name="team-password"
              type="password"
              value={inviteValues.password}
              error={inviteErrors.password}
              onChange={(value) => setInviteValues((current) => ({ ...current, password: value }))}
            />
            {inviteErrors.form ? <InlineError message={inviteErrors.form} /> : null}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Creating..." : "Create admin account"}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Current admins"
          description="Disable accounts instead of deleting them so session revocation and identity history stay intact."
        >
          {error ? <InlineError message={error} /> : null}
          {actionMessage ? <SuccessMessage message={actionMessage} /> : null}
          {isLoading ? (
            <EmptyState message="Loading admin accounts..." />
          ) : users.length === 0 ? (
            <EmptyState message="No admin accounts found." />
          ) : (
            <div className="space-y-4">
              {users.map((account) => (
                <div key={account.id} className="rounded-[24px] border border-stone-200 bg-stone-50 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{account.name}</h3>
                        <span
                          className={[
                            "rounded-full px-3 py-1 text-xs font-semibold",
                            account.banned ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700",
                          ].join(" ")}
                        >
                          {account.banned ? "Disabled" : "Active"}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{account.username ?? account.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-slate-400">{account.role ?? "admin"}</p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleBanToggle(account)}
                        className={[
                          "rounded-full px-4 py-2 text-sm font-medium transition",
                          account.banned
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
                        ].join(" ")}
                      >
                        {account.banned ? "Reactivate" : "Disable"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
                    <TextField
                      label="Temporary password"
                      name={`reset-password-${account.id}`}
                      type="password"
                      value={resetPasswordByUserId[account.id] ?? ""}
                      hint="Set a new temporary password, then share it directly with the admin."
                      onChange={(value) =>
                        setResetPasswordByUserId((current) => ({
                          ...current,
                          [account.id]: value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      onClick={() => void handleResetPassword(account)}
                      className="self-end rounded-2xl border border-stone-300 bg-white px-5 py-4 text-sm font-semibold text-slate-900 transition hover:border-amber-300 hover:bg-amber-50"
                    >
                      Reset password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}

function SecurityPage() {
  const auth = useAuth();
  const [values, setValues] = useState<ChangePasswordFormValues>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validateChangePassword(values);
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    const result = await auth.changePassword(values.currentPassword, values.newPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors({ form: result.message });
      return;
    }

    setErrors({});
    setValues({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setMessage("Password changed. Other sessions were revoked.");
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Security"
        title="Password and session hygiene"
        description="Change your password while signed in. This revokes your other sessions so old devices stop working."
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <SectionCard
          title="Current account"
          description="Use a unique password and rotate it whenever admin access changes."
        >
          <dl className="space-y-3">
            <SummaryRow label="Name" value={auth.user?.name ?? "Unknown"} />
            <SummaryRow label="Username" value={auth.user?.username ?? auth.user?.name ?? "Unknown"} />
            <SummaryRow label="Role" value={auth.user?.role ?? "admin"} />
          </dl>
        </SectionCard>

        <SectionCard
          title="Change password"
          description="You must know the current password. Forgot-password is intentionally omitted in v1."
        >
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <TextField
              label="Current password"
              name="currentPassword"
              type="password"
              value={values.currentPassword}
              error={errors.currentPassword}
              onChange={(value) => setValues((current) => ({ ...current, currentPassword: value }))}
            />
            <TextField
              label="New password"
              name="newPassword"
              type="password"
              value={values.newPassword}
              error={errors.newPassword}
              onChange={(value) => setValues((current) => ({ ...current, newPassword: value }))}
            />
            <TextField
              label="Confirm new password"
              name="confirmPassword"
              type="password"
              value={values.confirmPassword}
              error={errors.confirmPassword}
              onChange={(value) => setValues((current) => ({ ...current, confirmPassword: value }))}
            />

            {errors.form ? <InlineError message={errors.form} /> : null}
            {message ? <SuccessMessage message={message} /> : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-2xl bg-slate-950 px-5 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              {isSubmitting ? "Updating..." : "Change password"}
            </button>
          </form>
        </SectionCard>
      </div>
    </section>
  );
}

function AuthScreenState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-4">
      <div className="rounded-[28px] border border-stone-200 bg-white px-8 py-10 text-center shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-500">Trophy Admin</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{title}</h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function OrdersPage() {
  const { orders } = useOrders();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const filteredOrders = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return orders;
    }

    return orders.filter((order) =>
      [order.id, order.customer, order.status, order.channel].some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [deferredQuery]);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title="Order operations"
        description="Monitor order intake, fulfillment state, and channel performance from one queue."
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Open orders" value="18" hint="6 waiting for fulfillment" />
        <StatCard label="Gross sales" value="$1,103" hint="Past 24 hours" />
        <StatCard label="Refund risk" value="2 orders" hint="Flagged by support rules" />
      </div>
      <DataPanel
        title="All orders"
        description="Search by order id, customer, status, or channel."
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search orders"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:w-72"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Channel</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-4 font-semibold text-slate-800">
                    <Link to={`/orders/${order.id.slice(1)}`} className="transition hover:text-slate-950">
                      {order.id}
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{order.customer}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{order.items}</td>
                  <td className="px-4 py-4 text-slate-600">{order.channel}</td>
                  <td className="px-4 py-4 text-slate-600">{order.date}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(order.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredOrders.length === 0 ? <EmptyState message="No orders matched your current search." /> : null}
        </div>
      </DataPanel>
    </section>
  );
}

function OrderDetailPage() {
  const { orderId } = useParams();
  const { orders, runOrderAction } = useOrders();
  const navigate = useNavigate();
  const order = orders.find((entry) => entry.id === `#${orderId}`);
  const [error, setError] = useState<string | null>(null);

  if (!order) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Orders"
          title="Order not found"
          description="The requested order is not available in the current mock operations queue."
          actions={
            <Link
              to="/orders"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to orders
            </Link>
          }
        />
      </section>
    );
  }

  const currentOrder = order;

  const canCapture = currentOrder.paymentStatus === "Authorized" && currentOrder.status !== "Canceled";
  const canFulfill =
    currentOrder.paymentStatus === "Captured" &&
    currentOrder.fulfillmentStatus !== "Fulfilled" &&
    currentOrder.fulfillmentStatus !== "Canceled" &&
    currentOrder.status !== "Canceled";
  const canCancel = currentOrder.status !== "Canceled" && currentOrder.status !== "Fulfilled";

  function run(action: "capture" | "fulfill" | "cancel") {
    if ((action === "capture" && !canCapture) || (action === "fulfill" && !canFulfill) || (action === "cancel" && !canCancel)) {
      setError("This action is not available for the order's current payment or fulfillment state.");
      return;
    }

    const updated = runOrderAction(currentOrder.id, action);
    if (!updated) {
      setError("Unable to apply the requested action.");
      return;
    }

    setError(null);
    startTransition(() => {
      navigate(`/orders/${updated.id.slice(1)}`, { replace: true });
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Orders"
        title={`Order ${currentOrder.id}`}
        description={`Operational detail for ${currentOrder.customer}, including payment, fulfillment, and activity history.`}
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/orders"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to orders
            </Link>
            <button
              type="button"
              onClick={() => run("capture")}
              disabled={!canCapture}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Capture payment
            </button>
            <button
              type="button"
              onClick={() => run("fulfill")}
              disabled={!canFulfill}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark fulfilled
            </button>
            <button
              type="button"
              onClick={() => run("cancel")}
              disabled={!canCancel}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel order
            </button>
          </div>
        }
      />

      {error ? <InlineError message={error} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="Summary" description="High-level operational state and commercial totals.">
            <div className="grid gap-4 md:grid-cols-3">
              <StatCard label="Order status" value={currentOrder.status} hint={`Channel: ${currentOrder.channel}`} />
              <StatCard label="Payment" value={currentOrder.paymentStatus} hint={currentOrder.paymentMethod} />
              <StatCard label="Fulfillment" value={currentOrder.fulfillmentStatus} hint={`${currentOrder.items} items in order`} />
            </div>
          </SectionCard>

          <SectionCard title="Line items" description="Sellable units and variant-level pricing on the order.">
            <div className="space-y-3">
              {currentOrder.lineItems.map((item) => (
                <div key={`${item.title}-${item.variant}`} className="flex items-center justify-between rounded-2xl border border-stone-200 px-4 py-4">
                  <div>
                    <p className="font-medium text-slate-800">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.variant}</p>
                  </div>
                  <div className="text-right text-sm text-slate-500">
                    <p>{item.quantity} units</p>
                    <p>{formatCurrency(item.unitPrice)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="Customer" description="Primary contact and billing or shipping identity.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Name" value={currentOrder.customer} />
              <SummaryRow label="Email" value={currentOrder.email} />
              <SummaryRow label="Channel" value={currentOrder.channel} />
            </dl>
          </SectionCard>

          <SectionCard title="Addresses" description="Billing and shipping records for the order.">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-sm font-medium text-slate-700">Shipping</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{currentOrder.shippingAddress}</p>
              </div>
              <div className="rounded-2xl bg-stone-50 p-4">
                <p className="text-sm font-medium text-slate-700">Billing</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{currentOrder.billingAddress}</p>
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Payment" description="Current payment settlement state for operator review.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Method" value={currentOrder.paymentMethod} />
              <SummaryRow label="Status" value={currentOrder.paymentStatus} />
              <SummaryRow label="Total" value={formatCurrency(currentOrder.total)} />
            </dl>
          </SectionCard>

          <SectionCard title="Fulfillment" description="Shipment progress and whether more actions are available.">
            <ChecklistItem label="Payment captured" complete={currentOrder.paymentStatus === "Captured"} />
            <ChecklistItem label="Order fulfilled" complete={currentOrder.fulfillmentStatus === "Fulfilled"} />
            <ChecklistItem label="Order cancellable" complete={canCancel} />
          </SectionCard>

          <SectionCard title="Activity timeline" description="Chronological order events shown in a Medusa-like operational block.">
            <div className="space-y-4">
              {currentOrder.timeline.map((event) => (
                <div key={`${event.at}-${event.title}`} className="border-l-2 border-stone-200 pl-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{event.at}</p>
                  <p className="mt-2 font-medium text-slate-800">{event.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{event.detail}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </aside>
      </div>
    </section>
  );
}

function ProductsPage() {
  const { products } = useCatalog();
  const location = useLocation();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const flash = (location.state as { flash?: string } | null)?.flash;

  const filteredProducts = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return products;
    }

    return products.filter((product) =>
      [product.id, product.title, product.status, product.category, product.collection, product.handle].some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      ),
    );
  }, [deferredQuery, products]);

  const productStats = useMemo(
    () => ({
      published: products.filter((product) => product.status === "Published").length,
      lowStock: products.filter((product) => product.status === "Low stock").length,
      drafts: products.filter((product) => product.status === "Draft").length,
    }),
    [products],
  );

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Products"
        title="Catalog control"
        description="Track publish state, inventory pressure, and pricing across the current assortment."
        actions={
          <Link
            to="/products/new"
            className="inline-flex items-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Create product
          </Link>
        }
      />

      {flash ? (
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
          {flash}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Published" value={String(productStats.published)} hint="Visible in storefront" />
        <StatCard label="Low stock" value={String(productStats.lowStock)} hint="Needs replenishment soon" />
        <StatCard label="Drafts" value={String(productStats.drafts)} hint="Awaiting merchandising review" />
      </div>

      <DataPanel
        title="Product list"
        description="Search by title, handle, collection, category, or publish state."
        action={
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products"
            className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100 sm:w-72"
          />
        }
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Collection</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Inventory</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-4 py-4">
                    <Link to={`/products/${product.id}`} className="block">
                      <p className="font-semibold text-slate-800 transition hover:text-slate-950">{product.title}</p>
                      <p className="mt-1 font-mono text-xs text-slate-400">{product.handle}</p>
                    </Link>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{product.collection || "Unassigned"}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={product.status} />
                  </td>
                  <td className="px-4 py-4 text-slate-600">{product.inventory}</td>
                  <td className="px-4 py-4 text-slate-600">{product.updatedAt}</td>
                  <td className="px-4 py-4 font-medium text-slate-800">{formatCurrency(product.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredProducts.length === 0 ? <EmptyState message="No products matched your current search." /> : null}
        </div>
      </DataPanel>
    </section>
  );
}

function CreateProductPage() {
  const { products, createProduct } = useCatalog();
  const navigate = useNavigate();
  const [values, setValues] = useState<CreateProductFormValues>(defaultCreateProductValues);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([{ key: "", value: "" }]);
  const [errors, setErrors] = useState<CreateProductErrors>({});

  const variantPreview = useMemo(() => buildVariantPreview(values), [values]);
  const publishReady = isPublishReady(values, variantPreview);

  function setValue<K extends keyof CreateProductFormValues>(key: K, nextValue: CreateProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function updateAttribute(index: number, key: keyof ProductAttribute, nextValue: string) {
    setAttributes((current) =>
      current.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: nextValue } : attribute,
      ),
    );
  }

  function addAttributeRow() {
    setAttributes((current) => [...current, { key: "", value: "" }]);
  }

  function removeAttributeRow(index: number) {
    setAttributes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function toggleCategory(category: string) {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
  }

  function submit(mode: "draft" | "publish") {
    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products,
      variantPreview,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const nextProduct = createProduct({
      mode,
      values,
      attributes,
    });

    setErrors({});
    startTransition(() => {
      navigate("/products", {
        replace: true,
        state: {
          flash: `${nextProduct.title} was created as ${mode === "publish" ? nextProduct.status.toLowerCase() : "draft"}.`,
        },
      });
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Products"
        title="Create product"
        description="Build a Medusa-style product draft with organize metadata, media, attributes, and option-driven variants."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => submit("draft")}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => submit("publish")}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Publish product
            </button>
          </div>
        }
      />

      {errors.form ? <InlineError message={errors.form} /> : null}
      {errors.publish ? <InlineError message={errors.publish} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard
            title="Overview"
            description="Core product identity, handle, and descriptive content."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Title"
                name="title"
                value={values.title}
                error={errors.title}
                onChange={(value) => setValue("title", value)}
              />
              <TextField
                label="Handle"
                name="handle"
                value={values.handle}
                error={errors.handle}
                hint="Leave blank to auto-generate from the title."
                onChange={(value) => setValue("handle", value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Subtitle"
                name="subtitle"
                value={values.subtitle}
                onChange={(value) => setValue("subtitle", value)}
              />
              <TextField
                label="Type"
                name="type"
                value={values.type}
                onChange={(value) => setValue("type", value)}
                list="product-types"
              />
            </div>
            <TextAreaField
              label="Description"
              name="description"
              value={values.description}
              onChange={(value) => setValue("description", value)}
            />
          </SectionCard>

          <SectionCard
            title="Organize"
            description="Collections, categories, and tags used to place this product in the catalog."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Collection"
                value={values.collection}
                options={collectionOptions}
                onChange={(value) => setValue("collection", value)}
              />
              <TextField
                label="Tags"
                name="tags"
                value={values.tags}
                hint="Comma separated."
                onChange={(value) => setValue("tags", value)}
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Categories</p>
              <div className="flex flex-wrap gap-3">
                {categoryOptions.map((category) => {
                  const checked = values.categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        checked
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-slate-700 hover:border-stone-300",
                      ].join(" ")}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Media and attributes"
            description="Merchandising inputs that describe the product without affecting variant logic."
          >
            <TextAreaField
              label="Media URLs"
              name="media"
              value={values.media}
              hint="One URL per line."
              onChange={(value) => setValue("media", value)}
            />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Attributes</p>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-stone-300"
                >
                  Add attribute
                </button>
              </div>

              <div className="space-y-3">
                {attributes.map((attribute, index) => (
                  <div key={`${index}-${attribute.key}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <TextField
                      label={index === 0 ? "Attribute name" : ""}
                      name={`attribute-key-${index}`}
                      value={attribute.key}
                      onChange={(value) => updateAttribute(index, "key", value)}
                    />
                    <TextField
                      label={index === 0 ? "Attribute value" : ""}
                      name={`attribute-value-${index}`}
                      value={attribute.value}
                      onChange={(value) => updateAttribute(index, "value", value)}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeAttributeRow(index)}
                        disabled={attributes.length === 1}
                        className="w-full rounded-2xl border border-stone-200 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.attributes ? <p className="mt-3 text-sm text-rose-700">{errors.attributes}</p> : null}
            </div>
          </SectionCard>

          <SectionCard
            title="Variants"
            description="Base price and inventory feed the default variant or all generated combinations."
          >
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Base price"
                name="basePrice"
                type="number"
                value={values.basePrice}
                error={errors.basePrice}
                hint="Required to publish."
                onChange={(value) => setValue("basePrice", value)}
              />
              <TextField
                label="Inventory"
                name="inventory"
                type="number"
                value={values.inventory}
                hint="Used for all generated variants."
                onChange={(value) => setValue("inventory", value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Option one"
                name="optionNameOne"
                value={values.optionNameOne}
                error={errors.optionNameOne}
                hint="Examples: Size, Color"
                onChange={(value) => setValue("optionNameOne", value)}
              />
              <TextField
                label="Option values"
                name="optionValuesOne"
                value={values.optionValuesOne}
                error={errors.optionValuesOne}
                hint="Comma separated values."
                onChange={(value) => setValue("optionValuesOne", value)}
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Option two"
                name="optionNameTwo"
                value={values.optionNameTwo}
                error={errors.optionNameTwo}
                hint="Optional second dimension."
                onChange={(value) => setValue("optionNameTwo", value)}
              />
              <TextField
                label="Option values"
                name="optionValuesTwo"
                value={values.optionValuesTwo}
                error={errors.optionValuesTwo}
                hint="Comma separated values."
                onChange={(value) => setValue("optionValuesTwo", value)}
              />
            </div>

            {errors.variants ? <p className="text-sm text-rose-700">{errors.variants}</p> : null}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Generated variants</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {variantPreview.length === 1 ? "Default variant" : `${variantPreview.length} combinations ready`}
                  </p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                  {variantPreview.length} total
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {variantPreview.map((variant) => (
                  <div key={variant.title} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-800">{variant.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {variant.options.length > 0
                            ? variant.options.map((option) => `${option.option}: ${option.value}`).join(" • ")
                            : "No option selections"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatCurrency(variant.price)}</p>
                        <p>{variant.inventory} in stock</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard
            title="Publish checklist"
            description="Draft save is always available. Publish requires the catalog essentials."
          >
            <ChecklistItem label="Product title exists" complete={values.title.trim().length > 0} />
            <ChecklistItem label="Publishable price set" complete={Number(values.basePrice || 0) > 0} />
            <ChecklistItem label="Variant structure valid" complete={publishReady.variantStructureValid} />
            <ChecklistItem label="Collection or category assigned" complete={values.collection !== "" || values.categories.length > 0} />
          </SectionCard>

          <SectionCard
            title="Preview summary"
            description="Current draft shape derived from the form state."
          >
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Handle" value={values.handle.trim() || slugify(values.title || "new product")} />
              <SummaryRow label="Status on save draft" value="Draft" />
              <SummaryRow label="Status on publish" value={derivePublishedStatus(Number(values.inventory || 0))} />
              <SummaryRow label="Categories" value={values.categories.length > 0 ? values.categories.join(", ") : "None"} />
              <SummaryRow label="Collection" value={values.collection || "None"} />
              <SummaryRow label="Variants" value={String(variantPreview.length)} />
            </dl>
          </SectionCard>
        </aside>
      </div>

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </section>
  );
}

function ProductDetailPage() {
  const { productId } = useParams();
  const { products, updateProduct } = useCatalog();
  const navigate = useNavigate();
  const product = products.find((entry) => entry.id === productId);
  const [errors, setErrors] = useState<CreateProductErrors>({});

  const [values, setValues] = useState<CreateProductFormValues>(() =>
    product ? productToFormValues(product) : defaultCreateProductValues,
  );
  const [attributes, setAttributes] = useState<ProductAttribute[]>(() =>
    product && product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }],
  );

  useEffect(() => {
    if (!product) {
      return;
    }

    setValues(productToFormValues(product));
    setAttributes(product.attributes.length > 0 ? product.attributes : [{ key: "", value: "" }]);
  }, [product]);

  const variantPreview = useMemo(() => buildVariantPreview(values), [values]);
  const publishReady = isPublishReady(values, variantPreview);

  if (!product) {
    return (
      <section className="space-y-6">
        <PageHeader
          eyebrow="Products"
          title="Product not found"
          description="The requested product does not exist in the current mock catalog."
          actions={
            <Link
              to="/products"
              className="inline-flex items-center rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to products
            </Link>
          }
        />
      </section>
    );
  }

  const currentProduct = product;

  function setValue<K extends keyof CreateProductFormValues>(key: K, nextValue: CreateProductFormValues[K]) {
    setValues((current) => ({ ...current, [key]: nextValue }));
  }

  function updateAttribute(index: number, key: keyof ProductAttribute, nextValue: string) {
    setAttributes((current) =>
      current.map((attribute, currentIndex) =>
        currentIndex === index ? { ...attribute, [key]: nextValue } : attribute,
      ),
    );
  }

  function addAttributeRow() {
    setAttributes((current) => [...current, { key: "", value: "" }]);
  }

  function removeAttributeRow(index: number) {
    setAttributes((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function toggleCategory(category: string) {
    setValues((current) => ({
      ...current,
      categories: current.categories.includes(category)
        ? current.categories.filter((value) => value !== category)
        : [...current.categories, category],
    }));
  }

  function save(mode: "draft" | "publish") {
    const nextErrors = validateCreateProduct({
      mode,
      values,
      attributes,
      products: products.filter((entry) => entry.id !== currentProduct.id),
      variantPreview,
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const updated = updateProduct(currentProduct.id, (current) =>
      buildUpdatedProduct(current, {
        mode,
        values,
        attributes,
      }),
    );

    if (!updated) {
      setErrors({ form: "Unable to save the current product." });
      return;
    }

    setErrors({});
    startTransition(() => {
      navigate("/products", {
        replace: true,
        state: {
          flash: `${updated.title} was updated as ${mode === "publish" ? updated.status.toLowerCase() : "draft"}.`,
        },
      });
    });
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Products"
        title={currentProduct.title}
        description="Section-based editing workspace for overview, organize, descriptive fields, and variant-owned pricing."
        actions={
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/products"
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Back to products
            </Link>
            <button
              type="button"
              onClick={() => save("draft")}
              className="rounded-full border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:border-stone-400"
            >
              Save changes
            </button>
            <button
              type="button"
              onClick={() => save("publish")}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Publish
            </button>
          </div>
        }
      />

      {errors.form ? <InlineError message={errors.form} /> : null}
      {errors.publish ? <InlineError message={errors.publish} /> : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <SectionCard title="Overview" description="Edit the core identity and descriptive content shown for this product.">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Title"
                name="detail-title"
                value={values.title}
                error={errors.title}
                onChange={(value) => setValue("title", value)}
              />
              <TextField
                label="Handle"
                name="detail-handle"
                value={values.handle}
                error={errors.handle}
                onChange={(value) => setValue("handle", value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Subtitle"
                name="detail-subtitle"
                value={values.subtitle}
                onChange={(value) => setValue("subtitle", value)}
              />
              <TextField
                label="Type"
                name="detail-type"
                value={values.type}
                list="product-types"
                onChange={(value) => setValue("type", value)}
              />
            </div>
            <TextAreaField
              label="Description"
              name="detail-description"
              value={values.description}
              onChange={(value) => setValue("description", value)}
            />
          </SectionCard>

          <SectionCard title="Organize" description="Control collection placement, category assignment, and tags.">
            <div className="grid gap-5 md:grid-cols-2">
              <SelectField
                label="Collection"
                value={values.collection}
                options={collectionOptions}
                onChange={(value) => setValue("collection", value)}
              />
              <TextField
                label="Tags"
                name="detail-tags"
                value={values.tags}
                hint="Comma separated."
                onChange={(value) => setValue("tags", value)}
              />
            </div>
            <div>
              <p className="mb-3 text-sm font-medium text-slate-700">Categories</p>
              <div className="flex flex-wrap gap-3">
                {categoryOptions.map((category) => {
                  const checked = values.categories.includes(category);
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => toggleCategory(category)}
                      className={[
                        "rounded-full border px-4 py-2 text-sm font-medium transition",
                        checked
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-stone-200 bg-stone-50 text-slate-700 hover:border-stone-300",
                      ].join(" ")}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Media and attributes" description="Manage product-rich content that does not affect variant combinations.">
            <TextAreaField
              label="Media URLs"
              name="detail-media"
              value={values.media}
              hint="One URL per line."
              onChange={(value) => setValue("media", value)}
            />

            <div>
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Attributes</p>
                <button
                  type="button"
                  onClick={addAttributeRow}
                  className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-stone-300"
                >
                  Add attribute
                </button>
              </div>
              <div className="space-y-3">
                {attributes.map((attribute, index) => (
                  <div key={`${index}-${attribute.key}-${attribute.value}`} className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                    <TextField
                      label={index === 0 ? "Attribute name" : ""}
                      name={`detail-attribute-key-${index}`}
                      value={attribute.key}
                      onChange={(value) => updateAttribute(index, "key", value)}
                    />
                    <TextField
                      label={index === 0 ? "Attribute value" : ""}
                      name={`detail-attribute-value-${index}`}
                      value={attribute.value}
                      onChange={(value) => updateAttribute(index, "value", value)}
                    />
                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={() => removeAttributeRow(index)}
                        disabled={attributes.length === 1}
                        className="w-full rounded-2xl border border-stone-200 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-stone-300 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.attributes ? <p className="mt-3 text-sm text-rose-700">{errors.attributes}</p> : null}
            </div>
          </SectionCard>

          <SectionCard title="Variants and pricing" description="Variant prices remain owned by variants. Edit option structure through preview inputs.">
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Base price"
                name="detail-base-price"
                type="number"
                value={values.basePrice}
                error={errors.basePrice}
                onChange={(value) => setValue("basePrice", value)}
              />
              <TextField
                label="Inventory"
                name="detail-inventory"
                type="number"
                value={values.inventory}
                onChange={(value) => setValue("inventory", value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Option one"
                name="detail-option-one"
                value={values.optionNameOne}
                error={errors.optionNameOne}
                onChange={(value) => setValue("optionNameOne", value)}
              />
              <TextField
                label="Option values"
                name="detail-option-values-one"
                value={values.optionValuesOne}
                error={errors.optionValuesOne}
                onChange={(value) => setValue("optionValuesOne", value)}
              />
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <TextField
                label="Option two"
                name="detail-option-two"
                value={values.optionNameTwo}
                error={errors.optionNameTwo}
                onChange={(value) => setValue("optionNameTwo", value)}
              />
              <TextField
                label="Option values"
                name="detail-option-values-two"
                value={values.optionValuesTwo}
                error={errors.optionValuesTwo}
                onChange={(value) => setValue("optionValuesTwo", value)}
              />
            </div>
            {errors.variants ? <p className="text-sm text-rose-700">{errors.variants}</p> : null}

            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Variant preview</p>
                  <p className="mt-1 text-sm text-slate-500">Current detail edits generate the following sellable combinations.</p>
                </div>
                <StatusBadge status={product.status} />
              </div>
              <div className="mt-4 space-y-3">
                {variantPreview.map((variant) => (
                  <div key={variant.title} className="rounded-2xl bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-slate-800">{variant.title}</p>
                        <p className="mt-1 text-sm text-slate-500">
                          {variant.options.length > 0
                            ? variant.options.map((option) => `${option.option}: ${option.value}`).join(" • ")
                            : "No option selections"}
                        </p>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p>{formatCurrency(variant.price)}</p>
                        <p>{variant.inventory} in stock</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        <aside className="space-y-6">
          <SectionCard title="Publish status" description="Feedback aligned to Medusa-like publish gating rules.">
            <ChecklistItem label="Product title exists" complete={values.title.trim().length > 0} />
            <ChecklistItem label="Publishable price set" complete={Number(values.basePrice || 0) > 0} />
            <ChecklistItem label="Variant structure valid" complete={publishReady.variantStructureValid} />
            <ChecklistItem label="At least one category or collection assigned" complete={values.collection !== "" || values.categories.length > 0} />
          </SectionCard>
          <SectionCard title="Current record" description="Snapshot of the saved product and current edits.">
            <dl className="space-y-3 text-sm text-slate-600">
              <SummaryRow label="Handle" value={values.handle.trim() || product.handle} />
              <SummaryRow label="Saved status" value={product.status} />
              <SummaryRow label="Draft result" value="Draft" />
              <SummaryRow label="Publish result" value={derivePublishedStatus(Number(values.inventory || 0))} />
              <SummaryRow label="Variants" value={String(variantPreview.length)} />
              <SummaryRow label="Updated" value={product.updatedAt} />
            </dl>
          </SectionCard>
        </aside>
      </div>

      <datalist id="product-types">
        {typeOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </section>
  );
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-[28px] bg-white px-6 py-6 shadow-sm">
      <p className="text-sm font-medium uppercase tracking-[0.28em] text-slate-400">{eyebrow}</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
          <p className="mt-2 max-w-2xl text-slate-500">{description}</p>
        </div>
        {actions}
      </div>
    </header>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/20 p-4">
      <p className="text-sm text-slate-300">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-[28px] border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

function DataPanel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-stone-200 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        {action}
      </div>
      <div className="px-2 py-2 sm:px-4">{children}</div>
    </section>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[28px] border border-stone-200 bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  error,
  hint,
  type = "text",
  list,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  list?: string;
}) {
  return (
    <label className="block">
      {label ? <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span> : null}
      <input
        name={name}
        type={type}
        list={list}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={[
          "w-full rounded-2xl border bg-stone-50 px-4 py-4 outline-none transition",
          error ? "border-rose-300 ring-4 ring-rose-100" : "border-stone-200 focus:border-amber-400 focus:ring-4 focus:ring-amber-100",
        ].join(" ")}
      />
      {error ? <span className="mt-2 block text-sm text-rose-700">{error}</span> : null}
      {!error && hint ? <span className="mt-2 block text-sm text-slate-500">{hint}</span> : null}
    </label>
  );
}

function TextAreaField({
  label,
  name,
  value,
  onChange,
  hint,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <textarea
        name={name}
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      />
      {hint ? <span className="mt-2 block text-sm text-slate-500">{hint}</span> : null}
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineError({ message }: { message: string }) {
  return <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</p>;
}

function SuccessMessage({ message }: { message: string }) {
  return <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</p>;
}

function ChecklistItem({ label, complete }: { label: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-stone-50 px-4 py-3 text-sm">
      <span className="text-slate-700">{label}</span>
      <span className={complete ? "font-semibold text-emerald-700" : "font-semibold text-amber-700"}>
        {complete ? "Ready" : "Pending"}
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: OrderStatus | ProductStatus }) {
  const className =
    status === "Fulfilled" || status === "Published"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Processing"
        ? "bg-sky-50 text-sky-700"
        : status === "Pending" || status === "Low stock"
          ? "bg-amber-50 text-amber-700"
          : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{status}</span>;
}

function EmptyState({ message }: { message: string }) {
  return <div className="px-4 py-10 text-center text-sm text-slate-500">{message}</div>;
}

function validateLogin(values: LoginFormValues) {
  const result = v.safeParse(loginSchema, values);
  if (result.success) {
    return {};
  }

  return result.issues.reduce<LoginFormErrors>((accumulator, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in accumulator)) {
      accumulator[key as keyof LoginFormValues] = issue.message;
      return accumulator;
    }

    if (!accumulator.form) {
      accumulator.form = issue.message;
    }

    return accumulator;
  }, {});
}

function validateBootstrap(values: BootstrapFormValues) {
  const result = v.safeParse(bootstrapSchema, values);
  if (result.success) {
    return {};
  }

  return result.issues.reduce<BootstrapFormErrors>((accumulator, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in accumulator)) {
      accumulator[key as keyof BootstrapFormValues] = issue.message;
      return accumulator;
    }

    if (!accumulator.form) {
      accumulator.form = issue.message;
    }

    return accumulator;
  }, {});
}

function validateChangePassword(values: ChangePasswordFormValues) {
  const result = v.safeParse(changePasswordSchema, values);
  const errors = result.success
    ? {}
    : result.issues.reduce<ChangePasswordFormErrors>((accumulator, issue) => {
        const key = issue.path?.[0]?.key;
        if (typeof key === "string" && !(key in accumulator)) {
          accumulator[key as keyof ChangePasswordFormValues] = issue.message;
          return accumulator;
        }

        if (!accumulator.form) {
          accumulator.form = issue.message;
        }

        return accumulator;
      }, {});

  if (!errors.confirmPassword && values.newPassword !== values.confirmPassword) {
    errors.confirmPassword = "New passwords do not match.";
  }

  return errors;
}

function validateTeamInvite(values: TeamInviteFormValues) {
  const result = v.safeParse(teamInviteSchema, values);
  if (result.success) {
    return {};
  }

  return result.issues.reduce<TeamInviteFormErrors>((accumulator, issue) => {
    const key = issue.path?.[0]?.key;
    if (typeof key === "string" && !(key in accumulator)) {
      accumulator[key as keyof TeamInviteFormValues] = issue.message;
      return accumulator;
    }

    if (!accumulator.form) {
      accumulator.form = issue.message;
    }

    return accumulator;
  }, {});
}

function hasAdminAccess(role?: string | null) {
  const roles = role?.split(",").map((value) => value.trim()) ?? [];
  return roles.includes("admin") || roles.includes("super-admin");
}

function isSuperAdmin(role?: string | null) {
  return role?.split(",").map((value) => value.trim()).includes("super-admin") ?? false;
}

function getAuthErrorMessage(
  error: { message?: string; status?: number } | null | undefined,
  fallback: string,
) {
  if (!error) {
    return fallback;
  }

  if (typeof error.message === "string" && error.message.length > 0) {
    return error.message;
  }

  if (error.status === 401) {
    return "Your session is no longer valid. Sign in again.";
  }

  if (error.status === 403) {
    return "This account is not allowed to perform that action.";
  }

  return fallback;
}

function validateCreateProduct({
  mode,
  values,
  attributes,
  products,
  variantPreview,
}: {
  mode: "draft" | "publish";
  values: CreateProductFormValues;
  attributes: ProductAttribute[];
  products: CatalogProduct[];
  variantPreview: ProductVariant[];
}) {
  const nextErrors: CreateProductErrors = {};
  const schemaResult = v.safeParse(createProductSchema, values);

  if (!schemaResult.success) {
    for (const issue of schemaResult.issues) {
      const key = issue.path?.[0]?.key;
      if (typeof key === "string" && !(key in nextErrors)) {
        nextErrors[key as keyof CreateProductFormValues] = issue.message;
      }
    }
  }

  const normalizedHandle = values.handle.trim() ? slugify(values.handle) : slugify(values.title);
  if (normalizedHandle && products.some((product) => product.handle === normalizedHandle)) {
    nextErrors.handle = "Handle already exists in the mock catalog.";
  }

  if (values.optionNameOne.trim() !== "" && splitCommaValues(values.optionValuesOne).length === 0) {
    nextErrors.optionValuesOne = "Provide at least one value for option one.";
  }

  if (values.optionValuesOne.trim() !== "" && values.optionNameOne.trim() === "") {
    nextErrors.optionNameOne = "Name the first option before adding values.";
  }

  if (values.optionNameTwo.trim() !== "" && splitCommaValues(values.optionValuesTwo).length === 0) {
    nextErrors.optionValuesTwo = "Provide at least one value for option two.";
  }

  if (values.optionValuesTwo.trim() !== "" && values.optionNameTwo.trim() === "") {
    nextErrors.optionNameTwo = "Name the second option before adding values.";
  }

  const cleanedAttributes = attributes.filter((attribute) => attribute.key.trim() !== "" || attribute.value.trim() !== "");
  if (cleanedAttributes.some((attribute) => attribute.key.trim() === "" || attribute.value.trim() === "")) {
    nextErrors.attributes = "Each attribute row must have both a name and a value.";
  }

  if (mode === "publish") {
    if (Number(values.basePrice || 0) <= 0) {
      nextErrors.basePrice = "Base price must be greater than zero to publish.";
    }

    if (variantPreview.length === 0) {
      nextErrors.variants = "At least one valid variant is required to publish.";
    }

    if (!isPublishReady(values, variantPreview).ready) {
      nextErrors.publish = "Publish requires a title, a positive base price, and a valid variant structure.";
    }
  }

  return nextErrors;
}

function buildVariantPreview(values: CreateProductFormValues) {
  const basePrice = Number(values.basePrice || 0);
  const inventory = Number(values.inventory || 0);
  const normalizedInventory = Number.isFinite(inventory) ? inventory : 0;
  const optionPairs = [
    { name: values.optionNameOne.trim(), values: splitCommaValues(values.optionValuesOne) },
    { name: values.optionNameTwo.trim(), values: splitCommaValues(values.optionValuesTwo) },
  ].filter((option) => option.name !== "" && option.values.length > 0);

  if (optionPairs.length === 0) {
    return [
      {
        id: "preview_default",
        title: "Default variant",
        sku: "",
        price: Number.isFinite(basePrice) ? basePrice : 0,
        inventory: normalizedInventory,
        options: [],
      },
    ];
  }

  const combinations = buildOptionCombinations(optionPairs);
  return combinations.map((combination, index) => ({
    id: `preview_${index}`,
    title: combination.map((item) => item.value).join(" / "),
    sku: "",
    price: Number.isFinite(basePrice) ? basePrice : 0,
    inventory: normalizedInventory,
    options: combination,
  }));
}

function buildOptionCombinations(optionPairs: Array<{ name: string; values: string[] }>) {
  return optionPairs.reduce<VariantOptionValue[][]>(
    (accumulator, optionPair) =>
      accumulator.flatMap((combination) =>
        optionPair.values.map((value) => [...combination, { option: optionPair.name, value }]),
      ),
    [[]],
  );
}

function isPublishReady(values: CreateProductFormValues, variantPreview: ProductVariant[]) {
  const variantStructureValid = !(
    (values.optionNameOne.trim() !== "" && splitCommaValues(values.optionValuesOne).length === 0) ||
    (values.optionValuesOne.trim() !== "" && values.optionNameOne.trim() === "") ||
    (values.optionNameTwo.trim() !== "" && splitCommaValues(values.optionValuesTwo).length === 0) ||
    (values.optionValuesTwo.trim() !== "" && values.optionNameTwo.trim() === "") ||
    variantPreview.length === 0
  );

  return {
    ready: values.title.trim() !== "" && Number(values.basePrice || 0) > 0 && variantStructureValid,
    variantStructureValid,
  };
}

function createMockProduct(existingProducts: CatalogProduct[], input: CreateProductSubmission): CatalogProduct {
  const basePrice = Number(input.values.basePrice || 0);
  const inventory = Number(input.values.inventory || 0);
  const handle = ensureUniqueHandle(input.values.handle || input.values.title, existingProducts);
  const today = "2026-06-21";
  const variantPreview = buildVariantPreview(input.values);
  const tags = splitCommaValues(input.values.tags);
  const media = input.values.media
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const attributes = input.attributes.filter((attribute) => attribute.key.trim() !== "" && attribute.value.trim() !== "");
  const status =
    input.mode === "draft" ? "Draft" : derivePublishedStatus(Number.isFinite(inventory) ? inventory : 0);

  const variants = variantPreview.map((variant, index) => ({
    ...variant,
    id: `${handle}-variant-${index + 1}`,
    sku: buildSku(handle, index),
    price: Number.isFinite(basePrice) ? basePrice : 0,
    inventory: Number.isFinite(inventory) ? inventory : 0,
  }));

  return {
    id: `prod_${handle}`,
    title: input.values.title.trim(),
    handle,
    subtitle: input.values.subtitle.trim(),
    description: input.values.description.trim(),
    status,
    inventory: Number.isFinite(inventory) ? inventory : 0,
    price: Number.isFinite(basePrice) ? basePrice : 0,
    category: input.values.categories[0] ?? "Unassigned",
    collection: input.values.collection,
    type: input.values.type.trim(),
    categories: input.values.categories,
    tags,
    media,
    attributes,
    variants,
    updatedAt: today,
  };
}

function buildUpdatedProduct(current: CatalogProduct, input: CreateProductSubmission): CatalogProduct {
  const basePrice = Number(input.values.basePrice || 0);
  const inventory = Number(input.values.inventory || 0);
  const status =
    input.mode === "draft" ? "Draft" : derivePublishedStatus(Number.isFinite(inventory) ? inventory : 0);
  const variantPreview = buildVariantPreview(input.values);

  return {
    ...current,
    title: input.values.title.trim(),
    handle: slugify(input.values.handle || input.values.title || current.handle),
    subtitle: input.values.subtitle.trim(),
    description: input.values.description.trim(),
    status,
    inventory: Number.isFinite(inventory) ? inventory : 0,
    price: Number.isFinite(basePrice) ? basePrice : 0,
    category: input.values.categories[0] ?? "Unassigned",
    collection: input.values.collection,
    type: input.values.type.trim(),
    categories: input.values.categories,
    tags: splitCommaValues(input.values.tags),
    media: input.values.media
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean),
    attributes: input.attributes.filter((attribute) => attribute.key.trim() !== "" && attribute.value.trim() !== ""),
    variants: variantPreview.map((variant, index) => ({
      ...variant,
      id: `${current.id}-variant-${index + 1}`,
      sku: buildSku(input.values.handle || input.values.title || current.handle, index),
      price: Number.isFinite(basePrice) ? basePrice : 0,
      inventory: Number.isFinite(inventory) ? inventory : 0,
    })),
    updatedAt: "2026-06-21",
  };
}

function productToFormValues(product: CatalogProduct): CreateProductFormValues {
  const groupedOptions = product.variants.reduce<Map<string, string[]>>((accumulator, variant) => {
    for (const option of variant.options) {
      const existingValues = accumulator.get(option.option) ?? [];
      if (!existingValues.includes(option.value)) {
        existingValues.push(option.value);
      }
      accumulator.set(option.option, existingValues);
    }
    return accumulator;
  }, new Map());

  const orderedOptions = Array.from(groupedOptions.entries());

  return {
    title: product.title,
    handle: product.handle,
    subtitle: product.subtitle,
    description: product.description,
    type: product.type,
    collection: product.collection,
    categories: product.categories,
    tags: product.tags.join(", "),
    media: product.media.join("\n"),
    basePrice: String(product.price),
    inventory: String(product.inventory),
    optionNameOne: orderedOptions[0]?.[0] ?? "",
    optionValuesOne: orderedOptions[0]?.[1].join(", ") ?? "",
    optionNameTwo: orderedOptions[1]?.[0] ?? "",
    optionValuesTwo: orderedOptions[1]?.[1].join(", ") ?? "",
  };
}

function applyOrderAction(order: Order, action: "capture" | "fulfill" | "cancel"): Order {
  if (action === "capture") {
    return {
      ...order,
      status: order.status === "Pending" ? "Processing" : order.status,
      paymentStatus: "Captured",
      timeline: [
        { at: "2026-06-22 09:10", title: "Payment captured", detail: "Operator captured payment from the order detail page." },
        ...order.timeline,
      ],
    };
  }

  if (action === "fulfill") {
    return {
      ...order,
      status: "Fulfilled",
      fulfillmentStatus: "Fulfilled",
      timeline: [
        { at: "2026-06-22 09:25", title: "Order fulfilled", detail: "Operator marked the order as fully fulfilled." },
        ...order.timeline,
      ],
    };
  }

  return {
    ...order,
    status: "Canceled",
    paymentStatus: "Canceled",
    fulfillmentStatus: "Canceled",
    timeline: [
      { at: "2026-06-22 09:40", title: "Order canceled", detail: "Operator canceled the order from the detail page." },
      ...order.timeline,
    ],
  };
}

function derivePublishedStatus(inventory: number): ProductStatus {
  return inventory > 0 && inventory < 10 ? "Low stock" : "Published";
}

function ensureUniqueHandle(seed: string, existingProducts: CatalogProduct[]) {
  const base = slugify(seed || "new-product");
  const handles = new Set(existingProducts.map((product) => product.handle));

  if (!handles.has(base)) {
    return base;
  }

  let suffix = 2;
  while (handles.has(`${base}-${suffix}`)) {
    suffix += 1;
  }

  return `${base}-${suffix}`;
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function splitCommaValues(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSku(handle: string, index: number) {
  return `${handle.replace(/-/g, "_").toUpperCase()}_${String(index + 1).padStart(2, "0")}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default App;
