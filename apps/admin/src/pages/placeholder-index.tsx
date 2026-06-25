import { Container, Heading, Text } from "@medusajs/ui";
import { LayoutGrid, ListTree, Route } from "lucide-react";

export function PlaceholderIndexPage({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-y-6">
      <Container>
        <div className="flex flex-col gap-y-3">
          <Text size="small" className="text-ui-fg-muted uppercase tracking-wider">
            {eyebrow}
          </Text>
          <div className="flex flex-col gap-y-1">
            <Heading level="h2">{title}</Heading>
            <Text size="base" className="text-ui-fg-subtle">
              {description}
            </Text>
          </div>
        </div>
      </Container>

      <Container>
        <div className="flex flex-col gap-y-3">
          <div className="flex flex-col gap-y-1">
            <Heading level="h3">Planned admin slice</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              This placeholder keeps the Medusa-style information architecture navigable while the
              page is still out of scope.
            </Text>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Container className="flex flex-col gap-y-1">
              <Text size="small" className="text-ui-fg-subtle">
                Navigation parity
              </Text>
              <Heading level="h1" className="text-ui-fg-base">
                <Route className="-ml-1 mr-1 inline h-5 w-5 text-ui-fg-muted" />
                Ready
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
                Sidebar route and active state are live
              </Text>
            </Container>
            <Container className="flex flex-col gap-y-1">
              <Text size="small" className="text-ui-fg-subtle">
                Backend contract
              </Text>
              <Heading level="h1" className="text-ui-fg-base">
                <ListTree className="-ml-1 mr-1 inline h-5 w-5 text-ui-fg-muted" />
                Pending
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
                Still mock-first in the active feature
              </Text>
            </Container>
            <Container className="flex flex-col gap-y-1">
              <Text size="small" className="text-ui-fg-subtle">
                Next step
              </Text>
              <Heading level="h1" className="text-ui-fg-base">
                <LayoutGrid className="-ml-1 mr-1 inline h-5 w-5 text-ui-fg-muted" />
                Build page
              </Heading>
              <Text size="xsmall" className="text-ui-fg-muted">
                Expand the admin screen when this slice is prioritized
              </Text>
            </Container>
          </div>
        </div>
      </Container>
    </div>
  );
}
