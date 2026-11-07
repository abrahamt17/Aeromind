import { ActionForm } from "@/components/forms/action-form";
import { LinkButton } from "@/components/ui-kit";
import { enrollInCourse } from "@/lib/actions/academy";
import { getCurrentProfile } from "@/lib/auth/session";

export async function EnrollPanel({
  courseId,
  enrolled,
}: {
  courseId: string;
  enrolled: boolean;
}) {
  const profile = await getCurrentProfile();

  if (enrolled) {
    return <p className="text-sm font-medium text-brand">You are enrolled in this course.</p>;
  }
  if (!profile) {
    return (
      <div className="space-y-2">
        <LinkButton href="/sign-in" className="w-full">
          Sign in to enrol
        </LinkButton>
        <p className="text-sm text-muted-foreground">Preview lessons are open without an account.</p>
      </div>
    );
  }
  if (profile.role !== "trainee") {
    return <p className="text-sm text-muted-foreground">Enrolment is available on trainee accounts.</p>;
  }

  return (
    <div className="space-y-2">
      <ActionForm action={enrollInCourse.bind(null, courseId)} submitLabel="Enrol for free" fullWidth />
      <p className="text-sm text-muted-foreground">Demo enrolment. No payment is taken.</p>
    </div>
  );
}
