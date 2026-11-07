-- AeroMind Academy: instructors, courses, lessons, resources and enrolment.
-- Outlines are public. Lesson text is stored apart, because a readable row is
-- readable in full, and only preview lessons or enrolled students can read it.

-- Types -----------------------------------------------------------------------

create type public.course_kind as enum ('aeromind_original', 'expert');
create type public.course_level as enum ('beginner', 'intermediate', 'advanced');
create type public.content_review_status as enum (
  'draft',
  'awaiting_professional_review',
  'professionally_reviewed'
);
create type public.resource_kind as enum (
  'research_article',
  'academic_paper',
  'presentation',
  'educational_pdf',
  'case_study',
  'guide',
  'other'
);
create type public.resource_licence as enum (
  'aeromind_owned',
  'public_domain',
  'open_licence',
  'permission_granted',
  'link_only'
);
create type public.resource_access as enum ('public', 'free_account', 'enrolled', 'paid');
create type public.enrollment_source as enum ('simulated', 'free', 'paid', 'granted');

-- Instructors -----------------------------------------------------------------

-- Everything readable here is public once published. user_id links a future
-- instructor login and is left out of the client grants.
create table public.instructor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null check (char_length(display_name) between 1 and 120),
  title text not null check (char_length(title) between 1 and 160),
  bio text not null check (char_length(bio) between 1 and 2000),
  experience text not null default '' check (char_length(experience) <= 1000),
  qualifications text[] not null default '{}',
  expertise text[] not null default '{}',
  avatar_url text check (char_length(avatar_url) <= 500),
  verification_status public.verification_status not null default 'unverified',
  is_sample boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Courses ---------------------------------------------------------------------

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  kind public.course_kind not null,
  instructor_id uuid references public.instructor_profiles (id) on delete restrict,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 500),
  description text not null check (char_length(description) between 1 and 4000),
  category text not null check (char_length(category) between 1 and 80),
  competencies public.competency[] not null default '{}',
  level public.course_level not null,
  audience text not null check (char_length(audience) between 1 and 500),
  learning_objectives text[] not null default '{}',
  duration_minutes integer not null check (duration_minutes > 0),
  cover_image_url text check (char_length(cover_image_url) <= 500),
  review_status public.content_review_status not null default 'draft',
  is_sample boolean not null default false,
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expert_course_has_instructor check (kind <> 'expert' or instructor_id is not null)
);

create index courses_catalogue_idx on public.courses (published, featured, created_at desc);
create index courses_instructor_idx on public.courses (instructor_id);

create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '' check (char_length(summary) <= 500),
  unique (course_id, position)
);

-- The outline only. Lesson text lives in lesson_content.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules (id) on delete cascade,
  position integer not null check (position >= 0),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null default '' check (char_length(summary) <= 500),
  duration_minutes integer not null check (duration_minutes > 0),
  is_preview boolean not null default false,
  is_available boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (module_id, position),
  constraint preview_lesson_is_available check (not is_preview or is_available)
);

create table public.lesson_content (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 40000),
  learning_objectives text[] not null default '{}',
  video_url text check (char_length(video_url) <= 500),
  references_list jsonb not null default '[]' check (jsonb_typeof(references_list) = 'array'),
  updated_at timestamptz not null default now()
);

-- Resources -------------------------------------------------------------------

-- Each permission is separate: being able to link to a document never implies
-- that it may be downloaded, adapted or indexed by the AI.
create table public.learning_resources (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 300),
  description text not null check (char_length(description) between 1 and 2000),
  kind public.resource_kind not null,
  author text not null check (char_length(author) between 1 and 300),
  instructor_id uuid references public.instructor_profiles (id) on delete set null,
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_url text check (source_url is null or source_url ~ '^https://'),
  published_on date,
  licence public.resource_licence not null,
  licence_note text not null default '' check (char_length(licence_note) <= 500),
  can_download boolean not null default false,
  can_adapt boolean not null default false,
  can_index_ai boolean not null default false,
  access public.resource_access not null default 'enrolled',
  is_sample boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint link_only_grants_nothing
    check (licence <> 'link_only' or not (can_download or can_adapt or can_index_ai))
);

create index learning_resources_catalogue_idx on public.learning_resources (published, access);

create table public.course_resources (
  course_id uuid not null references public.courses (id) on delete cascade,
  resource_id uuid not null references public.learning_resources (id) on delete cascade,
  primary key (course_id, resource_id)
);

create index course_resources_resource_idx on public.course_resources (resource_id);

-- Enrolment -------------------------------------------------------------------

-- `source` keeps the payer open: nothing here assumes who pays, or that anyone does.
create table public.course_enrollments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  source public.enrollment_source not null default 'simulated',
  enrolled_at timestamptz not null default now(),
  unique (course_id, user_id)
);

create index course_enrollments_user_idx on public.course_enrollments (user_id, enrolled_at desc);

-- Triggers --------------------------------------------------------------------

create trigger set_updated_at before update on public.instructor_profiles
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.courses
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.lessons
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.lesson_content
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.learning_resources
  for each row execute function app_private.set_updated_at();

-- Access helpers --------------------------------------------------------------

-- SECURITY DEFINER so policies do not re-enter RLS on course_enrollments.
create function app_private.is_enrolled(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.course_enrollments e
    where e.course_id = p_course_id and e.user_id = (select auth.uid())
  );
$$;

create function app_private.can_read_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = p_lesson_id
      and l.is_available
      and c.published
      and (l.is_preview or app_private.is_enrolled(c.id))
  );
$$;

create function app_private.can_read_resource(
  p_resource_id uuid,
  p_access public.resource_access
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_access
    when 'public' then true
    when 'free_account' then (select auth.uid()) is not null
    when 'enrolled' then exists (
      select 1
      from public.course_resources cr
      join public.courses c on c.id = cr.course_id
      where cr.resource_id = p_resource_id
        and c.published
        and app_private.is_enrolled(c.id)
    )
    else false
  end;
$$;

-- Row Level Security ----------------------------------------------------------

alter table public.instructor_profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_content enable row level security;
alter table public.learning_resources enable row level security;
alter table public.course_resources enable row level security;
alter table public.course_enrollments enable row level security;

-- No client can write to the catalogue: content arrives through seed scripts.
grant select (
  id, slug, display_name, title, bio, experience, qualifications, expertise,
  avatar_url, verification_status, is_sample, published, created_at
) on public.instructor_profiles to anon, authenticated;
grant select on public.courses to anon, authenticated;
grant select on public.course_modules to anon, authenticated;
grant select on public.lessons to anon, authenticated;
grant select on public.lesson_content to anon, authenticated;
grant select on public.learning_resources to anon, authenticated;
grant select on public.course_resources to anon, authenticated;
grant select on public.course_enrollments to authenticated;

create policy "Anyone reads published instructors"
  on public.instructor_profiles for select to anon, authenticated
  using (published);

create policy "Anyone reads published courses"
  on public.courses for select to anon, authenticated
  using (published);

create policy "Anyone reads modules of published courses"
  on public.course_modules for select to anon, authenticated
  using (exists (
    select 1 from public.courses c where c.id = course_modules.course_id and c.published
  ));

create policy "Anyone reads the outline of published courses"
  on public.lessons for select to anon, authenticated
  using (exists (
    select 1
    from public.course_modules m
    join public.courses c on c.id = m.course_id
    where m.id = lessons.module_id and c.published
  ));

create policy "Preview and enrolled readers see lesson content"
  on public.lesson_content for select to anon, authenticated
  using (app_private.can_read_lesson(lesson_id));

create policy "Readers see resources their access allows"
  on public.learning_resources for select to anon, authenticated
  using (published and app_private.can_read_resource(id, access));

create policy "Anyone reads the resource list of published courses"
  on public.course_resources for select to anon, authenticated
  using (exists (
    select 1 from public.courses c where c.id = course_resources.course_id and c.published
  ));

create policy "Users read their own enrolments"
  on public.course_enrollments for select to authenticated
  using (user_id = (select auth.uid()));

-- Workflow --------------------------------------------------------------------

-- The only way to enrol. Payment is out of scope, so every enrolment is simulated.
create function public.enroll_in_course(p_course_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
  v_enrollment_id uuid;
begin
  if not exists (
    select 1 from public.courses c where c.id = p_course_id and c.published
  ) then
    raise exception 'This course is not available';
  end if;

  insert into public.course_enrollments (course_id, user_id)
  values (p_course_id, v_user_id)
  on conflict (course_id, user_id) do nothing
  returning id into v_enrollment_id;

  if v_enrollment_id is null then
    select e.id into v_enrollment_id
    from public.course_enrollments e
    where e.course_id = p_course_id and e.user_id = v_user_id;
  else
    perform app_private.log_event('course.enrolled', 'course', p_course_id);
  end if;

  return v_enrollment_id;
end;
$$;

-- Execution rights ------------------------------------------------------------

revoke all on function app_private.is_enrolled(uuid) from public, anon, authenticated;
revoke all on function app_private.can_read_lesson(uuid) from public, anon, authenticated;
revoke all on function app_private.can_read_resource(uuid, public.resource_access) from public, anon, authenticated;
revoke all on function public.enroll_in_course(uuid) from public, anon, authenticated;

grant usage on schema app_private to anon;
grant execute on function app_private.can_read_lesson(uuid) to anon, authenticated;
grant execute on function app_private.can_read_resource(uuid, public.resource_access) to anon, authenticated;
grant execute on function public.enroll_in_course(uuid) to authenticated;
