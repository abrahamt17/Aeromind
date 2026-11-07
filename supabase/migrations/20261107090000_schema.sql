-- AeroMind core schema.
-- Row Level Security, grants and workflow functions live in later migrations.

create schema if not exists app_private;

-- Types -----------------------------------------------------------------------

create type public.user_role as enum ('trainee', 'psychologist', 'admin');

create type public.verification_status as enum ('unverified', 'demo_verified', 'verified');

create type public.assessment_status as enum (
  'requested',
  'accepted',
  'declined',
  'cancelled',
  'questionnaire_submitted',
  'in_review',
  'report_released'
);

create type public.consent_purpose as enum ('questionnaire_processing', 'ai_development_plan');

create type public.training_stage as enum (
  'considering_career',
  'preparing_for_flight_school',
  'in_flight_training'
);

create type public.competency as enum (
  'stress_management',
  'decision_making',
  'attention_management',
  'situational_awareness',
  'emotional_regulation',
  'communication_teamwork',
  'workload_management',
  'human_factors'
);

create type public.plan_item_type as enum (
  'objective',
  'activity',
  'reflection',
  'scenario',
  'follow_up'
);

-- Identity --------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  display_name text not null check (char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.trainee_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  training_stage public.training_stage,
  country text check (char_length(country) <= 80),
  preferred_language text not null default 'en' check (char_length(preferred_language) between 2 and 12),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Everything here is public once published, so private data must never be added.
create table public.psychologist_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  headline text not null default '' check (char_length(headline) <= 160),
  bio text not null default '' check (char_length(bio) <= 2000),
  qualifications text[] not null default '{}',
  specialties text[] not null default '{}',
  languages text[] not null default '{}',
  consultation_formats text[] not null default '{}',
  country text check (char_length(country) <= 80),
  years_experience integer check (years_experience between 0 and 70),
  accepting_requests boolean not null default true,
  published boolean not null default false,
  is_sample boolean not null default false,
  verification_status public.verification_status not null default 'unverified',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint published_profile_is_complete
    check (not published or (headline <> '' and bio <> ''))
);

create index psychologist_profiles_directory_idx
  on public.psychologist_profiles (published, accepting_requests);

-- Assessment workflow ---------------------------------------------------------

create table public.assessment_requests (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.trainee_profiles (user_id) on delete cascade,
  psychologist_id uuid not null references public.psychologist_profiles (user_id) on delete restrict,
  status public.assessment_status not null default 'requested',
  trainee_message text check (char_length(trainee_message) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessment_requests_trainee_idx on public.assessment_requests (trainee_id, created_at desc);
create index assessment_requests_psychologist_idx on public.assessment_requests (psychologist_id, created_at desc);
create unique index assessment_requests_one_open_per_pair_idx
  on public.assessment_requests (trainee_id, psychologist_id)
  where status not in ('declined', 'cancelled', 'report_released');

create table public.consents (
  id uuid primary key default gen_random_uuid(),
  trainee_id uuid not null references public.trainee_profiles (user_id) on delete cascade,
  assessment_request_id uuid not null references public.assessment_requests (id) on delete cascade,
  purpose public.consent_purpose not null,
  policy_version text not null check (char_length(policy_version) between 1 and 40),
  granted_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  constraint withdrawn_after_granted check (withdrawn_at is null or withdrawn_at >= granted_at)
);

create unique index consents_one_active_idx
  on public.consents (assessment_request_id, purpose)
  where withdrawn_at is null;
create index consents_trainee_idx on public.consents (trainee_id);

create table public.demo_questionnaire_submissions (
  id uuid primary key default gen_random_uuid(),
  assessment_request_id uuid not null unique references public.assessment_requests (id) on delete cascade,
  trainee_id uuid not null references public.trainee_profiles (user_id) on delete cascade,
  questionnaire_version text not null check (char_length(questionnaire_version) between 1 and 40),
  responses jsonb not null check (jsonb_typeof(responses) = 'object'),
  submitted_at timestamptz not null default now()
);

create index demo_questionnaire_submissions_trainee_idx
  on public.demo_questionnaire_submissions (trainee_id);

create table public.professional_recommendations (
  id uuid primary key default gen_random_uuid(),
  assessment_request_id uuid not null references public.assessment_requests (id) on delete cascade,
  competency public.competency not null,
  -- Shown to the trainee once the report is released.
  recommendation_text text not null check (char_length(recommendation_text) between 1 and 2000),
  -- Written for educational use. This is the only recommendation text sent to the AI provider.
  educational_summary text not null check (char_length(educational_summary) between 1 and 1000),
  approved_for_ai boolean not null default false,
  approved_by uuid references public.profiles (id),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_fields_are_consistent check (
    (approved_for_ai and approved_by is not null and approved_at is not null)
    or (not approved_for_ai and approved_by is null and approved_at is null)
  )
);

create index professional_recommendations_request_idx
  on public.professional_recommendations (assessment_request_id);

-- Stored apart from recommendations because a readable row is readable in full.
create table public.assessment_private_notes (
  id uuid primary key default gen_random_uuid(),
  assessment_request_id uuid not null references public.assessment_requests (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index assessment_private_notes_request_idx
  on public.assessment_private_notes (assessment_request_id);

create table public.professional_reports (
  id uuid primary key default gen_random_uuid(),
  assessment_request_id uuid not null unique references public.assessment_requests (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  body text check (char_length(body) <= 20000),
  storage_path text,
  -- Every MVP report is a labelled sample. Clients cannot change this.
  is_sample boolean not null default true,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint report_has_content check (body is not null or storage_path is not null),
  constraint report_file_belongs_to_request
    check (storage_path is null or storage_path like assessment_request_id::text || '/%')
);

-- Development -----------------------------------------------------------------

create table public.learning_scenarios (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 500),
  competency public.competency not null,
  content jsonb not null check (jsonb_typeof(content) = 'object'),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One plan per assessment keeps generation deliberate and limits AI spend.
create table public.development_plans (
  id uuid primary key default gen_random_uuid(),
  assessment_request_id uuid not null unique references public.assessment_requests (id) on delete cascade,
  trainee_id uuid not null references public.trainee_profiles (user_id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  summary text not null check (char_length(summary) between 1 and 2000),
  language text not null default 'en' check (char_length(language) between 2 and 12),
  model text check (char_length(model) <= 80),
  is_sample boolean not null default false,
  created_at timestamptz not null default now()
);

create index development_plans_trainee_idx on public.development_plans (trainee_id);

create table public.development_plan_sources (
  plan_id uuid not null references public.development_plans (id) on delete cascade,
  recommendation_id uuid not null references public.professional_recommendations (id) on delete cascade,
  primary key (plan_id, recommendation_id)
);

create index development_plan_sources_recommendation_idx
  on public.development_plan_sources (recommendation_id);

create table public.development_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.development_plans (id) on delete cascade,
  position integer not null check (position >= 0),
  item_type public.plan_item_type not null,
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 2000),
  scenario_id uuid references public.learning_scenarios (id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (plan_id, position)
);

create index development_plan_items_scenario_idx on public.development_plan_items (scenario_id);

create table public.scenario_attempts (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.learning_scenarios (id) on delete cascade,
  trainee_id uuid not null references public.trainee_profiles (user_id) on delete cascade,
  plan_item_id uuid references public.development_plan_items (id) on delete set null,
  choices jsonb not null default '[]' check (jsonb_typeof(choices) = 'array'),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index scenario_attempts_trainee_idx on public.scenario_attempts (trainee_id, scenario_id);
create index scenario_attempts_plan_item_idx on public.scenario_attempts (plan_item_id);

-- Audit -----------------------------------------------------------------------

-- Append-only. actor_id has no foreign key so erasing a user cannot rewrite history.
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  event_type text not null check (char_length(event_type) between 1 and 80),
  entity_type text not null check (char_length(entity_type) between 1 and 80),
  entity_id uuid,
  metadata jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events (entity_type, entity_id);

-- Triggers --------------------------------------------------------------------

create function app_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at before update on public.profiles
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.trainee_profiles
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.psychologist_profiles
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.assessment_requests
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.professional_recommendations
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.assessment_private_notes
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.professional_reports
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.learning_scenarios
  for each row execute function app_private.set_updated_at();
create trigger set_updated_at before update on public.scenario_attempts
  for each row execute function app_private.set_updated_at();

-- Approval covers specific wording, so changing that wording withdraws it.
create function app_private.reset_recommendation_approval()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.competency is distinct from old.competency
    or new.educational_summary is distinct from old.educational_summary then
    new.approved_for_ai = false;
    new.approved_by = null;
    new.approved_at = null;
  end if;
  return new;
end;
$$;

create trigger reset_recommendation_approval
  before update on public.professional_recommendations
  for each row execute function app_private.reset_recommendation_approval();

create function app_private.prevent_audit_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_events is append-only';
end;
$$;

create trigger prevent_audit_changes
  before update or delete on public.audit_events
  for each row execute function app_private.prevent_audit_changes();

-- Runs once, when the auth user is created. `role` metadata is user-supplied, so
-- it is only allowed to choose between the two public roles here. After this,
-- profiles.role is the single source of truth and metadata is never read again.
create function app_private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role := case
    when new.raw_user_meta_data ->> 'role' = 'psychologist' then 'psychologist'::public.user_role
    else 'trainee'::public.user_role
  end;
  v_name text := left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), 'New user'), 120);
begin
  insert into public.profiles (id, role, display_name) values (new.id, v_role, v_name);

  if v_role = 'psychologist' then
    insert into public.psychologist_profiles (user_id, display_name) values (new.id, v_name);
  else
    insert into public.trainee_profiles (user_id) values (new.id);
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app_private.handle_new_user();
