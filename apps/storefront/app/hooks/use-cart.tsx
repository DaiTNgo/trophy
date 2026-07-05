import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  CART_STORAGE_KEY,
  addCartLine,
  deserializeCartLines,
  getCartItemCount,
  removeCartLine,
  serializeCartLines,
  updateCartLineQuantity,
  type AddCartLineInput,
  type CartCustomizationSummary,
  type CartLine,
} from "../lib/cart";

type CartContextValue = {
  lines: CartLine[];
  isReady: boolean;
  itemCount: number;
  addLine: (input: AddCartLineInput) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  removeLine: (lineId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setLines(deserializeCartLines(window.localStorage.getItem(CART_STORAGE_KEY)));
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(CART_STORAGE_KEY, serializeCartLines(lines));
  }, [isReady, lines]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    isReady,
    itemCount: getCartItemCount(lines),
    addLine(input) {
      setLines((current) => addCartLine(current, input, () => crypto.randomUUID()));
    },
    updateQuantity(lineId, quantity) {
      setLines((current) => updateCartLineQuantity(current, lineId, quantity));
    },
    removeLine(lineId) {
      setLines((current) => removeCartLine(current, lineId));
    },
    clearCart() {
      setLines([]);
    },
  }), [isReady, lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }

  return context;
}
