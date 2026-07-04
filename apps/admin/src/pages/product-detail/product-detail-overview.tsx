import { Container, Heading, Text } from "@medusajs/ui";
import { TextField } from "../../components/ui/medusa";
import { TextAreaField } from "../../components/ui/medusa/text-area-field";
import type { useProductDetail } from "./use-product-detail";

type ProductDetailOverviewProps = {
  state: ReturnType<typeof useProductDetail>;
};

export function ProductDetailOverview({ state }: ProductDetailOverviewProps) {
  const { values, errors, setValue } = state;

  return (
    <Container>
      <div className="flex flex-col gap-y-3">
        <div className="flex flex-col gap-y-1">
          <Heading level="h3">Overview</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Edit the core identity and descriptive content shown for this product.
          </Text>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TextField
            label="Title"
            name="detail-title"
            value={values.title}
            error={errors.title}
            onChange={(value) => setValue("title", value)}
          />
          <TextField
            label="Handle"
            name="detail-handle"
            value={values.handle}
            error={errors.handle}
            onChange={(value) => setValue("handle", value)}
          />
        </div>
        <div className="grid gap-5 md:grid-cols-1">
          <TextField
            label="Subtitle"
            name="detail-subtitle"
            value={values.subtitle}
            onChange={(value) => setValue("subtitle", value)}
          />
        </div>
        <TextAreaField
          label="Description"
          name="detail-description"
          value={values.description}
          onChange={(value) => setValue("description", value)}
        />
      </div>
    </Container>
  );
}
