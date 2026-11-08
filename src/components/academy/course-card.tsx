import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { SampleLabel } from "@/components/brand/sample-label";
import type { CourseSummary } from "@/lib/data/academy";
import { COURSE_KIND_LABELS, COURSE_LEVEL_LABELS, formatDuration } from "@/lib/labels";

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link
      href={`/academy/courses/${course.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/80 bg-card transition-all hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(15,30,58,0.35)]"
    >
      <div
        className={
          course.kind === "aeromind_original"
            ? "relative flex h-28 items-end justify-between gap-2 overflow-hidden bg-navy p-5"
            : "relative flex h-28 items-end justify-between gap-2 overflow-hidden bg-brand p-5"
        }
      >
        <svg viewBox="0 0 300 112" preserveAspectRatio="none" aria-hidden="true" className="absolute inset-0 h-full w-full">
          <path d="M-10 100 C 90 96, 180 60, 310 6" fill="none" stroke="#9fbcff" strokeWidth="1.5" strokeDasharray="6 9" opacity="0.5" />
          <circle cx="262" cy="26" r="4" fill="#f08a3c" />
        </svg>
        <span className="relative text-sm font-semibold text-white">{course.category}</span>
        <BookOpen aria-hidden="true" className="relative size-6 shrink-0 text-white/75" />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {COURSE_KIND_LABELS[course.kind]}
          </span>
          {course.is_sample ? <SampleLabel>Demo content</SampleLabel> : null}
        </div>
        <h3 className="mt-3 text-lg font-semibold transition-colors group-hover:text-brand">{course.title}</h3>
        <p className="mt-1 flex-1 text-sm text-muted-foreground">{course.summary}</p>
        <p className="mt-3 text-sm text-muted-foreground">{course.instructor_name ?? "AeroMind"}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock aria-hidden="true" className="size-4" />
            {formatDuration(course.duration_minutes)}
          </span>
          <span>{course.lesson_count} lessons</span>
          <span>{COURSE_LEVEL_LABELS[course.level]}</span>
        </div>
      </div>
    </Link>
  );
}

export function CourseGrid({ courses }: { courses: CourseSummary[] }) {
  return (
    <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {courses.map((course) => (
        <li key={course.id}>
          <CourseCard course={course} />
        </li>
      ))}
    </ul>
  );
}
