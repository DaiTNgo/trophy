import { useCallback, useEffect, useState } from "react";
import { toast } from "@medusajs/ui";

import {
  fetchAdminOrderDetail,
  updateAdminOrderItemProductionStatus,
  updateAdminOrderStatus,
  type AdminOrderDetail,
  type AdminOrderStatusUpdate,
} from "../../lib/orders-client";

export function useOrderDetail(orderNumber: string | undefined) {
  const [order, setOrder] = useState<AdminOrderDetail | null | undefined>(
    undefined,
  );
  const [error, setError] = useState("");
  const [updatingAction, setUpdatingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!orderNumber) {
      setOrder(null);
      return;
    }

    let cancelled = false;
    fetchAdminOrderDetail(orderNumber)
      .then((value) => {
        if (!cancelled) {
          setOrder(value);
          setError("");
        }
      })
      .catch((loadError) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load order detail",
          );
          setOrder(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [orderNumber]);

  const updateOrderStatus = useCallback(
    async (
      payload: AdminOrderStatusUpdate,
      successMessage: string,
      actionId: string,
    ) => {
      if (!order) return;

      setUpdatingAction(actionId);
      try {
        const nextOrder = await updateAdminOrderStatus(
          order.orderNumber,
          payload,
        );
        setOrder(nextOrder);
        toast.success(successMessage);
      } catch (updateError) {
        toast.error(
          updateError instanceof Error
            ? updateError.message
            : "Failed to update order",
        );
      } finally {
        setUpdatingAction(null);
      }
    },
    [order],
  );

  const markItemReadyForProduction = useCallback(
    async (itemId: number, actionId: string) => {
      if (!order) return;

      setUpdatingAction(actionId);
      try {
        const nextOrder = await updateAdminOrderItemProductionStatus(
          order.orderNumber,
          itemId,
          {
            productionStatus: "ready",
          },
        );
        setOrder(nextOrder);
        toast.success("Item marked ready for production");
      } catch (updateError) {
        toast.error(
          updateError instanceof Error
            ? updateError.message
            : "Failed to update production status",
        );
      } finally {
        setUpdatingAction(null);
      }
    },
    [order],
  );

  return {
    order,
    error,
    updatingAction,
    updateOrderStatus,
    markItemReadyForProduction,
  };
}
