import { Checkbox, Popover, Text } from "@medusajs/ui";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function CategoryMultiSelect({
  values,
  options,
  onChange,
}: {
  values: string[];
  options: string[];
  onChange: (categories: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(option: string) {
    const next = values.includes(option)
      ? values.filter((v) => v !== option)
      : [...values, option];
    onChange(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-base px-3 py-2 text-left text-sm transition hover:border-ui-border-interactive focus:border-ui-border-interactive focus:outline-none"
        >
          {values.length > 0 ? (
            <span className="text-ui-fg-base">
              {values.length} selected
            </span>
          ) : (
            <span className="text-ui-fg-muted">Select categories</span>
          )}
          <ChevronDown className="size-4 text-ui-fg-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Content
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-[var(--radix-popover-trigger-width)] p-0"
      >
        <div className="border-b border-ui-border-base px-3 py-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories..."
            className="w-full bg-transparent text-sm text-ui-fg-base outline-none placeholder:text-ui-fg-muted"
          />
        </div>
        <div className="max-h-60 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <Text size="small" className="text-ui-fg-muted">
                No categories found
              </Text>
            </div>
          ) : (
            filtered.map((option) => {
              const checked = values.includes(option);
              return (
                <label
                  key={option}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition hover:bg-ui-bg-base-hover"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(option)}
                  />
                  <span className="text-ui-fg-base">{option}</span>
                </label>
              );
            })
          )}
        </div>
      </Popover.Content>
    </Popover>
  );
}
