import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { SaveResourceButton } from "@/components/academy/lesson-controls";
import { ResourceCard } from "@/components/academy/resource-card";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { getCurrentProfile } from "@/lib/auth/session";
import { listResources } from "@/lib/data/academy";
import { listSavedResourceIds } from "@/lib/data/learning";

export const metadata: Metadata = { title: "Learning resources" };

async function Resources() {
  await connection();
  const profile = await getCurrentProfile();
  const resources = await listResources(profile?.id ?? null);
  const isTrainee = profile?.role === "trainee";
  const saved = isTrainee ? await listSavedResourceIds(profile.id) : new Set<string>();

  if (resources.length === 0) {
    return <EmptyState title="No resources yet" description="New learning resources will appear here." />;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {resources.map((resource) => (
        <li key={resource.id}>
          <ResourceCard
            resource={resource}
            action={isTrainee ? <SaveResourceButton resourceId={resource.id} saved={saved.has(resource.id)} /> : null}
          />
        </li>
      ))}
    </ul>
  );
}

export default function ResourcesPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <PageHeader eyebrow="Academy"
          title="Learning resources"
          description="Original publications, linked at their source. Some resources appear only after you sign in or enrol."
        />
        <Suspense fallback={<PageSkeleton />}>
          <Resources />
        </Suspense>
      </main>
      <SiteFooter />
    </>
  );
}
