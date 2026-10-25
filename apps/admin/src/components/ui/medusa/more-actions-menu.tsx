import type { ReactNode } from "react";
import { Button, DropdownMenu, IconButton } from "@medusajs/ui";
import { MoreHorizontal } from "lucide-react";

/**
 * "More" (…) dropdown for page sections and table rows. `button` is the bordered section
 * trigger; `icon` is the borderless one used in table rows.
 */
export function MoreActionsMenu({
  trigger = "button",
  children,
}: {
  trigger?: "button" | "icon";
  children: ReactNode;
}) {
  return (
    <DropdownMenu>
      <DropdownMenu.Trigger asChild>
        {trigger === "icon" ? (
          <IconButton variant="transparent" size="small">
            <MoreHorizontal className="h-4 w-4 text-ui-fg-muted" />
          </IconButton>
        ) : (
          <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
            <span className="sr-only">More</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end">{children}</DropdownMenu.Content>
    </DropdownMenu>
  );
}
