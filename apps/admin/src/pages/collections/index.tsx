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

type Collection = {
  id: number;
  title: string;
  handle: string;
  description: string | null;
  imageUrl: string | null;
  position: number;
};

export function CollectionsListPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCollections() {
      try {
        const res = await backendFetch("/api/admin/product-metadata/collections");
        if (res.ok) {
          const data = await res.json();
          setCollections(data.items);
        }
      } catch (e) {
        console.error("Failed to load collections", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadCollections();
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
              <Heading level="h2">Collections</Heading>
              <Text size="base" className="text-ui-fg-subtle">
                Group products into merchandised sets.
              </Text>
            </div>
            <Button variant="secondary" size="small" asChild>
              <Link to="/collections/new">
                <Plus className="h-4 w-4" />
                Create collection
              </Link>
            </Button>
          </div>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-y-1 mb-4">
          <Heading level="h3">Collections list</Heading>
        </div>
        <div className="mt-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                Loading...
              </Text>
            </div>
          ) : collections.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Text size="small" className="text-ui-fg-muted">
                No collections found.
              </Text>
            </div>
          ) : (
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Title</Table.HeaderCell>
                  <Table.HeaderCell>Handle</Table.HeaderCell>
                  <Table.HeaderCell>Description</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Position</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {collections.map((collection) => (
                  <Table.Row key={collection.id}>
                    <Table.Cell>
                      <Link
                        to={`/collections/${collection.id}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                      >
                        {collection.title}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {collection.handle}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle truncate max-w-[200px]">
                        {collection.description || "-"}
                      </Text>
                    </Table.Cell>
                    <Table.Cell className="text-right">
                      <Text size="small" className="text-ui-fg-subtle">
                        {collection.position}
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
