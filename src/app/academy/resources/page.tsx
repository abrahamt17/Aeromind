import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { ResourceCard } from "@/components/academy/resource-card";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { EmptyState, PageHeader } from "@/components/ui-kit";
import { getSessionUserId } from "@/lib/auth/session";
import { listResources } from "@/lib/data/academy";

export const metadata: Metadata = { title: "Learning resources" };

async function Resources() {
  await connection();
  const resources = await listResources(await getSessionUserId());

  if (resources.length === 0) {
    return <EmptyState title="No resources yet" description="New learning resources will appear here." />;
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {resources.map((resource) => (
        <li key={resource.id}>
          <ResourceCard resource={resource} />
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
        <PageHeader
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
