import { PageHeader, SectionCard, StatCard } from "../components/ui/medusa";

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
    <section className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <SectionCard title="Planned admin slice" description="This placeholder keeps the Medusa-style information architecture navigable while the page is still out of scope.">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Navigation parity" value="Ready" hint="Sidebar route and active state are live" />
          <StatCard label="Backend contract" value="Pending" hint="Still mock-first in the active feature" />
          <StatCard label="Next step" value="Build page" hint="Expand the admin screen when this slice is prioritized" />
        </div>
      </SectionCard>
    </section>
  );
}
