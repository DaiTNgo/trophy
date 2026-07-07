export type AuthUser = {
  id: string;
  username?: string | null;
  name: string;
  role?: string | null;
  banned?: boolean | null;
};

export type AuthContextValue = {
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

export type OrderStatus = "Pending" | "Processing" | "Fulfilled" | "Canceled";
export type ProductStatus = "Published" | "Draft" | "Proposed" | "Rejected";

export type Order = {
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

export type OrderContextValue = {
  orders: Order[];
  runOrderAction: (orderId: string, action: "capture" | "fulfill" | "cancel") => Order | null;
};

export type CatalogProduct = {
  id: string;
  title: LocalizedTextValue;
  handle: string;
  subtitle: LocalizedTextValue;
  description: LocalizedTextValue;
  status: ProductStatus;
  inventory: number;
  price: number;
  category: string;
  collection: string;
  collectionId: number | null;
  categories: string[];
  categoryIds: number[];
  media: string[];
  attributes: ProductAttribute[];
  optionDefinitions: ProductOptionDefinition[];
  variants: ProductVariant[];
  customization?: {
    enabled: boolean;
    canvasWidthPx: number | null;
    canvasHeightPx: number | null;
    layers: unknown[];
    formFields: unknown[];
    layerCount: number;
    formFieldCount: number;
  } | null;
  updatedAt: string;
};

export type CatalogContextValue = {
  products: CatalogProduct[];
  createProduct: (product: CatalogProduct) => CatalogProduct;
  updateProduct: (productId: string, updater: (product: CatalogProduct) => CatalogProduct) => CatalogProduct | null;
};

export type ProductVariantMedia = {
  id: string;
  fileName: string;
  mimeType: string;
  widthPx: number;
  heightPx: number;
  byteSize: number;
  contentUrl: string;
  file?: File;
  isPending?: boolean;
};

export type AdminLocale = "vi" | "en";

export type LocalizedTextValue = Record<AdminLocale, string>;

export type ProductVariant = {
  id: string;
  title: string;
  sku: string;
  price: number;
  inventory: number;
  options: VariantOptionValue[];
  allowBackorder: boolean;
  media: ProductVariantMedia[];
  shouldCreate: boolean;
};

export type VariantOptionValue = {
  option: string;
  value: string;
  optionValueId?: number;
};

export type ProductOptionDefinition = {
  id: string;
  title: string;
  titleTranslations?: LocalizedTextValue;
  values: ProductOptionValueDefinition[];
};

export type ProductOptionValueDefinition = {
  id: string;
  value: string;
  valueTranslations?: LocalizedTextValue;
};

export type ProductAttribute = {
  key: string;
  value: string;
};

export type CreateProductFormValues = {
  title: LocalizedTextValue;
  handle: string;
  subtitle: LocalizedTextValue;
  description: LocalizedTextValue;
  customizationEnabled: boolean;
  collection: string;
  categories: string[];
  media: string;
  hasVariants: boolean;
  basePrice: string;
  inventory: string;
  optionNameOne: string;
  optionValuesOne: string;
  optionNameTwo: string;
  optionValuesTwo: string;
};

export type CreateProductSubmission = {
  mode: "draft" | "publish";
  values: CreateProductFormValues;
  attributes: ProductAttribute[];
  optionDefinitions?: ProductOptionDefinition[];
  variantRows?: ProductVariant[];
};

export type CreateProductErrors = Partial<
  Record<
    | keyof CreateProductFormValues
    | "attributes"
    | "optionDefinitions"
    | "publish"
    | "variants"
    | "form",
    string
  >
>;

export type LoginFormValues = {
  username: string;
  password: string;
};

export type LoginFormErrors = Partial<Record<keyof LoginFormValues | "form", string>>;

export type ChangePasswordFormValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type ChangePasswordFormErrors = Partial<Record<keyof ChangePasswordFormValues | "form", string>>;

export type AdminUserRecord = {
  id: string;
  username?: string | null;
  name: string;
  role?: string | null;
  banned?: boolean | null;
  banReason?: string | null;
};

export type TeamInviteFormValues = {
  username: string;
  password: string;
};

export type TeamInviteFormErrors = Partial<Record<keyof TeamInviteFormValues | "form", string>>;

export type OnboardingFormValues = {
  username: string;
  password: string;
};

export type OnboardingFormErrors = Partial<Record<keyof OnboardingFormValues | "form", string>>;
