import { Languages, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { SampleLabel } from "@/components/brand/sample-label";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, LinkButton, PageHeader } from "@/components/ui-kit";
import { listProfessionals } from "@/lib/data/professionals";
import { VERIFICATION_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Find a professional" };

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

async function Directory({ searchParams }: { searchParams: PageProps<"/professionals">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const filters = {
    query: single(params.q),
    language: single(params.language),
    specialty: single(params.specialty),
  };
  const { professionals, languages, specialties } = await listProfessionals(filters);
  const hasFilters = Boolean(filters.query || filters.language || filters.specialty);

  return (
    <>
      <form className="mb-6 grid gap-3 rounded-xl border bg-card p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <Input
          name="q"
          defaultValue={filters.query}
          placeholder="Search by name, topic or country"
          aria-label="Search professionals"
          className="h-10 bg-card"
        />
        <select name="specialty" defaultValue={filters.specialty} aria-label="Specialty" className={SELECT_CLASS}>
          <option value="">All specialties</option>
          {specialties.map((specialty) => (
            <option key={specialty}>{specialty}</option>
          ))}
        </select>
        <select name="language" defaultValue={filters.language} aria-label="Language" className={SELECT_CLASS}>
          <option value="">All languages</option>
          {languages.map((language) => (
            <option key={language}>{language}</option>
          ))}
        </select>
        <Button type="submit" className="h-10">
          Apply filters
        </Button>
      </form>

      {professionals.length === 0 ? (
        <EmptyState
          title="No professionals match"
          description="Try a different search or remove a filter."
          action={<LinkButton href="/professionals" variant="outline">Clear filters</LinkButton>}
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" role="status">
            {professionals.length} {professionals.length === 1 ? "professional" : "professionals"}
            {hasFilters ? " match your filters" : ""}
          </p>
          <ul className="grid gap-4 md:grid-cols-2">
            {professionals.map((professional) => (
              <li key={professional.user_id}>
                <Link
                  href={`/professionals/${professional.user_id}`}
                  className="flex h-full flex-col rounded-xl border bg-card p-5 transition-colors hover:border-brand"
                >
                  <div className="flex flex-wrap gap-2">
                    {professional.is_sample ? <SampleLabel>Sample profile</SampleLabel> : null}
                    <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      {VERIFICATION_LABELS[professional.verification_status]}
                    </span>
                  </div>
                  <h2 className="mt-3 text-lg font-semibold">{professional.display_name}</h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{professional.headline}</p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    {professional.country ? (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin aria-hidden="true" className="size-3.5" />
                        {professional.country}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1.5">
                      <Languages aria-hidden="true" className="size-3.5" />
                      {professional.languages.join(", ")}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-brand">
                    {professional.accepting_requests ? "Accepting requests" : "Not accepting requests"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

export default function ProfessionalsPage({ searchParams }: PageProps<"/professionals">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader
          title="Find a professional"
          description="Browse aviation-psychology professionals. Every profile in this prototype is a labelled sample, and demo verification is not a real credential check."
        />
        <Suspense fallback={<PageSkeleton />}>
          <Directory searchParams={searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
