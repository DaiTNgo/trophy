import { Button, IconButton } from "@medusajs/ui";
import { Plus, Trash2 } from "lucide-react";
import { LocalizedTextField } from "../ui/medusa";
import type { AdminLocale, LocalizedTextValue } from "../../types";

export type AttributeItem = {
  key: LocalizedTextValue;
  value: LocalizedTextValue;
};

type ProductAttributesEditorProps = {
  attributes: AttributeItem[];
  onChange: (attributes: AttributeItem[]) => void;
  locale: AdminLocale;
  onLocaleChange: (locale: AdminLocale) => void;
  disableRemoveIfOne?: boolean;
};

export function ProductAttributesEditor({
  attributes,
  onChange,
  locale,
  onLocaleChange,
  disableRemoveIfOne = false,
}: ProductAttributesEditorProps) {
  const updateAttributeField = (
    index: number,
    field: "key" | "value",
    val: LocalizedTextValue,
  ) => {
    const newAttrs = [...attributes];
    newAttrs[index] = { ...newAttrs[index], [field]: val };
    onChange(newAttrs);
  };

  const addAttributeRow = () => {
    onChange([...attributes, { key: { vi: "", en: "" }, value: { vi: "", en: "" } }]);
  };

  const removeAttributeRow = (index: number) => {
    onChange(attributes.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {attributes.map((attribute, index) => (
        <div key={index} className="flex gap-3 items-center">
          <div className="flex-1 min-w-0">
            <LocalizedTextField
              id={`attribute-key-${index}`}
              value={attribute.key}
              locale={locale}
              onLocaleChange={onLocaleChange}
              onChange={(val) => updateAttributeField(index, "key", val)}
              placeholder={{ vi: "Tên thuộc tính (VD: Chất liệu)", en: "Attribute name" }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <LocalizedTextField
              id={`attribute-value-${index}`}
              value={attribute.value}
              locale={locale}
              onLocaleChange={onLocaleChange}
              onChange={(val) => updateAttributeField(index, "value", val)}
              placeholder={{ vi: "Giá trị (VD: Cotton)", en: "Attribute value" }}
            />
          </div>
          <IconButton
            type="button"
            variant="transparent"
            onClick={() => removeAttributeRow(index)}
            disabled={disableRemoveIfOne && attributes.length === 1}
          >
            <Trash2 className="h-4 w-4 text-ui-fg-error" />
          </IconButton>
        </div>
      ))}
      <div>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={addAttributeRow}
        >
          <Plus className="h-4 w-4" />
          Add attribute
        </Button>
      </div>
    </div>
  );
}
