import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Container,
  Heading,
  Table,
  Text,
} from "@medusajs/ui";
import { Plus } from "lucide-react";
import { backendFetch } from "../../lib/fetch";

type Category = {
  id: number;
  name: string;
  handle: string;
  description: string | null;
  parentId: number | null;
  imageUrl: string | null;
};

export function CategoriesListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await backendFetch("/api/admin/product-metadata/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.items);
        }
      } catch (e) {
        console.error("Failed to load categories", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            Products
          </Text>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex flex-col gap-y-1">
              <Heading level="h2">Categories</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Shape shopper-facing taxonomy and category assignments.
              </Text>
            </div>
            <Button variant="secondary" size="small" asChild>
              <Link to="/categories/new">
                <Plus className="h-4 w-4" />
                Create category
              </Link>
            </Button>
          </div>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-y-1 mb-4">
          <Heading level="h3">Categories list</Heading>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                Loading...
              </Text>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                No categories found.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Name</Table.HeaderCell>
                  <Table.HeaderCell>Handle</Table.HeaderCell>
                  <Table.HeaderCell>Description</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Parent ID</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {categories.map((category) => (
                  <Table.Row key={category.id}>
                    <Table.Cell>
                      <Link
                        to={`/categories/${category.id}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                      >
                        {category.name}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {category.handle}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle truncate max-w-[200px]">
                        {category.description || "-"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" className="text-ui-fg-subtle">
                        {category.parentId || "-"}
                      </Text>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          )}
        </div>
      </Container>
    </div>
  );
}
