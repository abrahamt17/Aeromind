import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { CourseGrid } from "@/components/academy/course-card";
import { ResourceCard } from "@/components/academy/resource-card";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WelcomeBanner } from "@/components/dashboard";
import { EmptyState, LinkButton } from "@/components/ui-kit";
import { listCourses, listResources } from "@/lib/data/academy";
import { COURSE_LEVEL_LABELS } from "@/lib/labels";

export const metadata: Metadata = { title: "Academy" };

const SELECT_CLASS =
  "h-10 w-full rounded-lg border border-input bg-card px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

async function Catalogue({ searchParams }: { searchParams: PageProps<"/academy">["searchParams"] }) {
  await connection();
  const params = await searchParams;
  const filters = { query: single(params.q), category: single(params.category), level: single(params.level) };
  const hasFilters = Boolean(filters.query || filters.category || filters.level);
  const [{ courses, categories }, resources] = await Promise.all([listCourses(filters), listResources(null)]);

  return (
    <>
      <form className="grid gap-3 rounded-2xl border border-border/80 bg-card p-4 md:grid-cols-[2fr_1fr_1fr_auto]">
        <Input
          name="q"
          defaultValue={filters.query}
          placeholder="Search courses by topic or instructor"
          aria-label="Search courses"
          className="h-10 bg-card"
        />
        <select name="category" defaultValue={filters.category} aria-label="Category" className={SELECT_CLASS}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <select name="level" defaultValue={filters.level} aria-label="Level" className={SELECT_CLASS}>
          <option value="">All levels</option>
          {Object.entries(COURSE_LEVEL_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <Button type="submit" className="h-10">
          Apply filters
        </Button>
      </form>

      {courses.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No courses match"
            description="Try a different search or remove a filter."
            action={
              <LinkButton href="/academy" variant="outline">
                Clear filters
              </LinkButton>
            }
          />
        </div>
      ) : hasFilters ? (
        <Section title={`${courses.length} ${courses.length === 1 ? "course" : "courses"} found`}>
          <CourseGrid courses={courses} />
        </Section>
      ) : (
        <>
          <Section title="Featured courses">
            <CourseGrid courses={courses.filter((course) => course.featured)} />
          </Section>
          <Section title="AeroMind Originals" description="Created by AeroMind from published aviation sources.">
            <CourseGrid courses={courses.filter((course) => course.kind === "aeromind_original")} />
          </Section>
          <Section title="Expert courses" description="Demonstrations of how qualified professionals could publish here.">
            <CourseGrid courses={courses.filter((course) => course.kind === "expert")} />
          </Section>
          <Section title="Recently added">
            <CourseGrid
              courses={[...courses]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 3)}
            />
          </Section>
          <Section title="Learning resources" description="Original publications from aviation authorities.">
            <ul className="grid gap-4 md:grid-cols-2">
              {resources.slice(0, 2).map((resource) => (
                <li key={resource.id}>
                  <ResourceCard resource={resource} />
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <LinkButton href="/academy/resources" variant="outline">
                See all resources
              </LinkButton>
            </div>
          </Section>
        </>
      )}
    </>
  );
}

export default function AcademyPage(props: PageProps<"/academy">) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <WelcomeBanner
          eyebrow="AeroMind Academy"
          title="Learn the human side of flying"
          description="Aviation psychology and human-performance learning for aspiring and student pilots. Educational content only: it does not assess fitness to fly."
          actions={
            <>
              <LinkButton
                href="/academy/resources"
                size="lg"
                variant="outline"
                className="rounded-full border-white/25 bg-transparent px-5 text-white hover:bg-white/10 hover:text-white"
              >
                Learning resources
              </LinkButton>
              <p className="inline-flex items-center gap-2 self-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-[#dce4f2]">
                <span className="size-1.5 rounded-full bg-warm" />
                Demo courses, awaiting professional review
              </p>
            </>
          }
        />
        <Suspense fallback={<PageSkeleton />}>
          <Catalogue searchParams={props.searchParams} />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
