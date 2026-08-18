import { useCallback, useEffect, useState } from "react";
import { toast } from "@medusajs/ui";

import {
  fetchAdminOrderDetail,
  checkAdminOrderMisaLink,
  purgeAdminOrder,
  runAdminOrderMisaAction,
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
          if (value && value.misa.syncStatus !== "disconnected") {
            void checkAdminOrderMisaLink(value.orderNumber).then((misa) => {
              if (!cancelled) setOrder((current) => current ? { ...current, misa } : current);
            }).catch(() => undefined);
          }
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

  const purgeOrder = useCallback(async () => {
    if (!order) return false;

    setUpdatingAction("purge-order");
    try {
      await purgeAdminOrder(order.orderNumber);
      toast.success("Order permanently deleted");
      return true;
    } catch (purgeError) {
      toast.error(
        purgeError instanceof Error
          ? purgeError.message
          : "Failed to permanently delete order",
      );
      return false;
    } finally {
      setUpdatingAction(null);
    }
  }, [order]);

  const runMisaAction = useCallback(async (
    action: "connect" | "refresh" | "disconnect",
  ) => {
    if (!order) return;
    setUpdatingAction(`misa-${action}`);
    try {
      const nextOrder = await runAdminOrderMisaAction(order.orderNumber, action);
      setOrder(nextOrder);
      toast.success(
        action === "disconnect"
          ? "MISA SaleOrder disconnected"
          : action === "connect"
            ? "MISA SaleOrder connected"
            : "MISA connection refreshed",
      );
    } catch (misaError) {
      toast.error(misaError instanceof Error ? misaError.message : "Failed to update MISA connection");
    } finally {
      setUpdatingAction(null);
    }
  }, [order]);

  const markItemPendingReview = useCallback(
    async (itemId: number, actionId: string) => {
      if (!order) return;

      setUpdatingAction(actionId);
      try {
        const nextOrder = await updateAdminOrderItemProductionStatus(
          order.orderNumber,
          itemId,
          {
            productionStatus: "pending_review",
          },
        );
        setOrder(nextOrder);
        toast.success("Item marked as pending review");
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
    purgeOrder,
    runMisaAction,
    markItemReadyForProduction,
    markItemPendingReview,
  };
}
