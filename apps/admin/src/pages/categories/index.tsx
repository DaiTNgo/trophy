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
  StatusBadge,
} from "@medusajs/ui";
import { MoreHorizontal, Search } from "lucide-react";
import { backendFetch } from "../../lib/fetch";
import { EditRankingModal } from "./components/edit-ranking-modal";
import { CreateCategoryModal } from "./components/create-category-modal";
import { useBreadcrumbs } from "../../hooks/use-breadcrumbs";
import type { LocalizedTextValue } from "../../types";

type Category = {
  id: number;
  name: LocalizedTextValue;
  handle: string;
  parentId: number | null;
  imageUrl: string | null;
};

export function CategoriesListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { setBreadcrumbs } = useBreadcrumbs();

  useEffect(() => {
    setBreadcrumbs([{ label: "Categories", path: "/categories" }]);
    return () => setBreadcrumbs([]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await backendFetch("/api/admin/product-metadata/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
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
    <Container className="p-0 overflow-hidden">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 px-6 py-4 lg:flex-row lg:items-start lg:justify-between border-b border-ui-border-base">
          <div className="flex flex-col gap-y-1">
            <Heading level="h2" className="text-xl font-semibold">Categories</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Organize products into categories, and manage those categories' ranking and hierarchy.
            </Text>
          </div>
          <div className="flex items-center gap-x-2">
            <Button variant="secondary" size="small" onClick={() => setIsRankingModalOpen(true)}>
              Edit ranking
            </Button>
            <Button variant="secondary" size="small" onClick={() => setIsCreateModalOpen(true)}>
              Create
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center justify-end px-6 py-4 border-b border-ui-border-base">
          <div className="relative">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ui-fg-muted">
              <Search className="h-4 w-4" />
            </div>
            <Input type="search" placeholder="Search" className="pl-8 w-[200px]" size="small" />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell className="pl-6">Name</Table.HeaderCell>
                <Table.HeaderCell>Handle</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
                <Table.HeaderCell>Visibility</Table.HeaderCell>
                <Table.HeaderCell className="pr-6 w-12" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {isLoading ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 5 } as any)} className="text-center py-8 text-ui-fg-muted">
                    Loading...
                  </Table.Cell>
                </Table.Row>
              ) : categories.length === 0 ? (
                <Table.Row>
                  <Table.Cell {...({ colSpan: 5 } as any)} className="text-center py-8 text-ui-fg-muted">
                    No categories found.
                  </Table.Cell>
                </Table.Row>
              ) : (
                categories.map((category) => (
                  <Table.Row key={category.id}>
                    <Table.Cell className="pl-6">
                      <Link
                        to={`/categories/${category.id}`}
                        className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover font-medium"
                      >
                        {category.name.vi}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {category.handle}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color="green">Active</StatusBadge>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge color="green">Public</StatusBadge>
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
                            <Link to={`/categories/${category.id}`}>Edit</Link>
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
      
      <EditRankingModal
        open={isRankingModalOpen}
        onOpenChange={setIsRankingModalOpen}
        items={categories.map(c => ({ id: String(c.id), name: c.name.vi }))}
        onSave={async (orderedItems) => {
          const res = await backendFetch("/api/admin/product-metadata/categories/ranking", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categories: orderedItems.map((item, index) => ({ id: Number(item.id), position: index }))
            })
          });
          if (res.ok) {
            setCategories(prev => {
              const map = new Map(prev.map(c => [String(c.id), c]));
              return orderedItems.map(item => map.get(item.id)).filter(Boolean) as Category[];
            });
          }
        }}
      />

      <CreateCategoryModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        categories={categories.map(c => ({ id: String(c.id), name: c.name.vi }))}
        onSuccess={() => {
          // Re-fetch categories
          async function reload() {
            const res = await backendFetch("/api/admin/product-metadata/categories");
            if (res.ok) {
              const data = await res.json();
              setCategories(data.categories); // Note: updated to use data.categories based on the backend changes
            }
          }
          reload();
        }}
      />
    </Container>
  );
}
