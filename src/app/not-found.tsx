import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/layout/site-chrome";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-20 text-center">
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="mt-2 text-muted-foreground">This page does not exist or has moved.</p>
        <Button className="mt-6" nativeButton={false} render={<Link href="/" />}>
          Back to home
        </Button>
      </main>
      <SiteFooter />
    </>
  );
}
