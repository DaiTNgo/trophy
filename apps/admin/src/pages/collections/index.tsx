import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  Button,
  Container,
  DropdownMenu,
  Heading,
  Input,
  Table,
  Text,
} from "@medusajs/ui";
import { ArrowUpDown, MoreHorizontal, Search } from "lucide-react";
import { backendFetch } from "../../lib/fetch";
import { useBreadcrumbs } from "../../hooks/use-breadcrumbs";
import { CreateCollectionModal } from "./components/create-collection-modal";

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Collections", path: "/collections" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

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
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-start lg:justify-between border-b border-ui-border-base">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2" className="text-xl font-semibold">Collections</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Organize products into collections.
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={() => setIsCreateModalOpen(true)}>
              Create
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
          <Button variant="secondary" size="small">
            Add filter
          </Button>
          <div className="flex items-center gap-x-2">
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
                <Search className="h-4 w-4" />
              </div>
              <Input type="search" placeholder="Search" className="pl-8 w-[200px]" size="small" />
            </div>
            <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
              <span className="sr-only">Sort</span>
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="pl-6">Title</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Products</Table.HeaderCell>
                <Table.HeaderCell className="pr-6 w-12" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 4 } as any)} className="text-center py-8 text-ui-fg-muted">
                    Loading...
                  </Table.Cell>
                </Table.Row>
              ) : collections.length === 0 ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 4 } as any)} className="text-center py-8 text-ui-fg-muted">
                    No collections found.
                  </Table.Cell>
                </Table.Row>
              ) : (
                collections.map((collection) => (
                  <Table.Row key={collection.id}>
                    <Table.Cell className="pl-6">
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
                      <Text size="small" className="text-ui-fg-subtle">-</Text>
                    </Table.Cell>
                    <Table.Cell className="pr-6">
                      <DropdownMenu>
                        <DropdownMenu.Trigger asChild>
                          <Button variant="secondary" size="small" className="px-2 flex items-center justify-center h-[28px]">
                            <span className="sr-only">More</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Content align="end">
                          <DropdownMenu.Item asChild>
                            <Link to={`/collections/${collection.id}`}>Edit</Link>
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>
      </div>

      <CreateCollectionModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={() => {
          // Re-fetch collections
          async function reload() {
            const res = await backendFetch("/api/admin/product-metadata/collections");
            if (res.ok) {
              const data = await res.json();
              setCollections(data.items);
            }
          }
          reload();
        }}
      />
    </Container>
  );
}
