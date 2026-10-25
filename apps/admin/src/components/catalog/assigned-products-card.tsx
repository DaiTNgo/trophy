import { Button, Container, Heading, Table, Text } from "@medusajs/ui";
import { AlertCircle } from "lucide-react";
import { Link } from "react-router";

type AssignedProduct = {
  id: number;
  title: string;
  status: string;
  media?: Array<{ url: string }>;
};

/** Splits a new product selection into the ids to add and remove for an assignment request. */
export function diffProductAssignment(currentProducts: AssignedProduct[], selectedIds: string[]) {
  const currentIds = new Set(currentProducts.map((p) => p.id.toString()));
  const nextIds = new Set(selectedIds);
  return {
    addProductIds: [...nextIds].filter((id) => !currentIds.has(id)).map((id) => parseInt(id, 10)),
    removeProductIds: [...currentIds].filter((id) => !nextIds.has(id)).map((id) => parseInt(id, 10)),
  };
}

/** "Products" card listing the products assigned to a category or collection. */
export function AssignedProductsCard({
  products,
  onEdit,
}: {
  products: AssignedProduct[];
  onEdit: () => void;
}) {
  return (
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2" className="text-xl font-semibold">
            Products
          </Heading>
          <Button variant="secondary" size="small" onClick={onEdit}>
            Add filter
          </Button>
        </div>
        <div className="flex flex-col border-t border-ui-border-base">
          {products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-6 w-6 text-ui-fg-subtle mb-2" />
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell className="pl-6">Product</Table.HeaderCell>
                  <Table.HeaderCell className="pr-6">Status</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {products.map((product) => (
                  <Table.Row key={product.id}>
                    <Table.Cell className="pl-6">
                      <div className="flex items-center gap-x-3">
                        {product.media?.[0] ? (
                          <img
                            src={product.media[0].url}
                            alt={product.title}
                            className="w-8 h-8 rounded object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-ui-bg-component rounded" />
                        )}
                        <Link
                          to={`/products/${product.id}`}
                          className="text-ui-fg-base font-medium hover:text-ui-fg-interactive"
                        >
                          <Text size="small" weight="plus">
                            {product.title}
                          </Text>
                        </Link>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="pr-6">
                      <Text size="small">{product.status}</Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </div>
    </Container>
  );
}
