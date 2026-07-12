import { Text, Badge } from "@medusajs/ui";
import { TagSolid } from "@medusajs/icons";
import { SortableItem, DragHandle, type Edge } from "./sortable-list";

export type RankingListItem = {
  id: string;
  name: string;
  isNew?: boolean;
};

interface RankingListProps {
  items: RankingListItem[];
  onReorder: (sourceId: string, targetId: string, closestEdge: Edge | null) => void;
}

export function RankingList({ items, onReorder }: RankingListProps) {
  return (
    <div className="flex flex-col border border-ui-border-base rounded-md bg-ui-bg-base shadow-sm my-2">
      {items.map((item, index) => (
        <SortableItem
          key={item.id}
          id={item.id}
          items={items}
          onReorder={onReorder}
          className={index !== items.length - 1 ? "border-b border-ui-border-base" : ""}
        >
          <div className={`flex items-center gap-x-4 bg-ui-bg-base px-4 py-3 hover:bg-ui-bg-base-hover transition-colors ${index === 0 ? "rounded-t-md" : ""} ${index === items.length - 1 ? "rounded-b-md" : ""}`}>
            <DragHandle label={`Move ${item.name}`} />
            <TagSolid className="w-5 h-5 text-ui-fg-subtle" />
            <Text size="small" className="text-ui-fg-base flex items-center gap-x-2">
              {item.name}
              {item.isNew && (
                <Badge color="blue" size="small">New</Badge>
              )}
            </Text>
          </div>
        </SortableItem>
      ))}
    </div>
  );
}
