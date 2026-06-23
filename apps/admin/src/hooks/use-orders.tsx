import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { OrderContextValue } from "../types";
import { initialOrders } from "../lib/mock-data";
import { applyOrderAction } from "../lib/order-utils";

const orderContext = createContext<OrderContextValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState(initialOrders);

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

export function useOrders() {
  const context = useContext(orderContext);
  if (!context) {
    throw new Error("useOrders must be used within OrderProvider.");
  }

  return context;
}
