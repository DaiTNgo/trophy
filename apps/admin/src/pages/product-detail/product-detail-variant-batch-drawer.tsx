import { Button, Drawer, Input, Text } from "@medusajs/ui";

type VariantBatchRow = {
  id: number;
  title: string;
  value: string;
};

type VariantBatchDrawerProps = {
  open: boolean;
  title: string;
  rows: VariantBatchRow[];
  inputType: "number";
  submitLabel: string;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onRowsChange: (rows: VariantBatchRow[]) => void;
  onSave: () => void;
};

export function VariantBatchDrawer({
  open,
  title,
  rows,
  inputType,
  submitLabel,
  isSaving,
  onOpenChange,
  onRowsChange,
  onSave,
}: VariantBatchDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{title}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
          {rows.map((row, index) => (
            <div key={row.id} className="grid gap-3 md:grid-cols-[1fr_180px]">
              <div className="flex items-center">
                <Text size="small" weight="plus">
                  {row.title}
                </Text>
              </div>
              <Input
                value={row.value}
                onChange={(event) =>
                  onRowsChange(
                    rows.map((item, itemIndex) =>
                      itemIndex === index
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  )
                }
                placeholder="0"
                type={inputType}
              />
            </div>
          ))}
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild>
            <Button variant="secondary" disabled={isSaving}>
              Cancel
            </Button>
          </Drawer.Close>
          <Button onClick={onSave} isLoading={isSaving}>
            {submitLabel}
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
