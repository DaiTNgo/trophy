import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button, Container, Heading, Text } from "@medusajs/ui";
import { ArrowLeft } from "@medusajs/icons";
import { useBreadcrumbs } from "../hooks/use-breadcrumbs";
import { useOrderDetail } from "./order-detail/use-order-detail";
import { OrderDetailHeader } from "./order-detail/order-detail-header";
import { OrderDetailSidebar } from "./order-detail/order-detail-sidebar";
import { OrderCustomizationPreviewModal } from "./order-detail/order-customization-preview-modal";
import { OrderDetailMainContent } from "./order-detail/order-detail-main-content";
import type { OrderDetailItem } from "./order-detail/order-detail-utils";

export function OrderDetailPage() {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    if (orderNumber) {
      setBreadcrumbs([
        { label: "Orders", path: "/orders" },
        { label: `#${orderNumber}` },
      ]);
    }
    return () => setBreadcrumbs([]);
  }, [orderNumber, setBreadcrumbs]);

  const [previewItem, setPreviewItem] = useState<OrderDetailItem | null>(null);
  const {
    order,
    error,
    updatingAction,
    updateOrderStatus,
    purgeOrder,
    runMisaAction,
    markItemReadyForProduction,
    markItemPendingReview,
  } = useOrderDetail(orderNumber);

  const activePreviewItem = previewItem
    ? order?.items.find((item) => item.id === previewItem.id) ?? previewItem
    : null;

  if (order === undefined) {
    return (
      <Container>
        <Text size="small" className="text-ui-fg-muted">
          Loading order…
        </Text>
      </Container>
    );
  }

  if (!order || error) {
    return (
      <div className="flex flex-col gap-y-6">
        <div className="flex items-center gap-x-2">
          <Link
            to="/orders"
            className="text-ui-fg-subtle hover:text-ui-fg-base text-small transition-colors"
          >
            Orders
          </Link>
          <Text size="small" className="text-ui-fg-muted">
            ›
          </Text>
          <Text size="small" className="text-ui-fg-muted">
            Error
          </Text>
        </div>
        <Container>
          <div className="flex flex-col gap-y-3">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-y-1">
                <Heading level="h2">Order not found</Heading>
                <Text size="base" className="text-ui-fg-subtle">
                  {error ||
                    "The requested order is not available in the backend queue."}
                </Text>
              </div>
              <Button variant="secondary" size="small" asChild>
                <Link to="/orders">
                  <ArrowLeft className="h-4 w-4" />
                  Back to orders
                </Link>
              </Button>
            </div>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-y-4">
      <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Left Column - Main Content */}
        <div className="flex min-w-0 flex-col gap-y-4">
          <OrderDetailHeader
            order={order}
            isUpdating={Boolean(updatingAction)}
            onPurge={async () => {
              if (await purgeOrder()) {
                navigate("/orders");
              }
            }}
          />

          <OrderDetailMainContent
            order={order}
            updatingAction={updatingAction}
            onUpdateStatus={updateOrderStatus}
            onPreviewItemChange={setPreviewItem}
            onMarkItemReady={markItemReadyForProduction}
            onMarkItemPendingReview={markItemPendingReview}
          />
        </div>

        <div className="min-w-0">
          <OrderDetailSidebar
            order={order}
            updatingAction={updatingAction}
            onMisaAction={runMisaAction}
          />
        </div>
      </div>
      {activePreviewItem ? (
        <OrderCustomizationPreviewModal
          order={order}
          item={activePreviewItem}
          isUpdating={Boolean(updatingAction)}
          onMarkItemReady={markItemReadyForProduction}
          onMarkItemPendingReview={markItemPendingReview}
          onClose={() => setPreviewItem(null)}
        />
      ) : null}
    </div>
  );
}
