-- Access control. Supabase grants broad table privileges by default and RLS only
-- filters rows, so this migration removes those grants and adds back only what
-- each role needs. Field-level rules (role, verification, approval, release and
-- status) are enforced by leaving those columns out of the grants below.

alter default privileges in schema public revoke all on tables from anon, authenticated;
revoke all on all tables in schema public from anon, authenticated;

grant usage on schema app_private to authenticated;

-- Helpers ---------------------------------------------------------------------

-- SECURITY DEFINER so policies on other tables do not re-enter RLS.
create function app_private.is_request_trainee(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessment_requests r
    where r.id = p_request_id and r.trainee_id = (select auth.uid())
  );
$$;

create function app_private.is_request_psychologist(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessment_requests r
    where r.id = p_request_id and r.psychologist_id = (select auth.uid())
  );
$$;

create function app_private.request_has_status(
  p_request_id uuid,
  p_statuses public.assessment_status[]
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.assessment_requests r
    where r.id = p_request_id and r.status = any (p_statuses)
  );
$$;

-- Row Level Security on every table -------------------------------------------

alter table public.profiles enable row level security;
alter table public.trainee_profiles enable row level security;
alter table public.psychologist_profiles enable row level security;
alter table public.assessment_requests enable row level security;
alter table public.consents enable row level security;
alter table public.demo_questionnaire_submissions enable row level security;
alter table public.professional_recommendations enable row level security;
alter table public.assessment_private_notes enable row level security;
alter table public.professional_reports enable row level security;
alter table public.development_plans enable row level security;
alter table public.development_plan_sources enable row level security;
alter table public.development_plan_items enable row level security;
alter table public.learning_scenarios enable row level security;
alter table public.scenario_attempts enable row level security;
alter table public.audit_events enable row level security;

-- profiles --------------------------------------------------------------------

grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy "Users read their own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "Psychologists read assigned trainee profiles"
  on public.profiles for select to authenticated
  using (exists (
    select 1 from public.assessment_requests r
    where r.trainee_id = profiles.id and r.psychologist_id = (select auth.uid())
  ));

create policy "Users update their own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- trainee_profiles ------------------------------------------------------------

grant select on public.trainee_profiles to authenticated;
grant update (training_stage, country, preferred_language, onboarding_completed_at)
  on public.trainee_profiles to authenticated;

create policy "Trainees read their own trainee profile"
  on public.trainee_profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Psychologists read assigned trainee details"
  on public.trainee_profiles for select to authenticated
  using (exists (
    select 1 from public.assessment_requests r
    where r.trainee_id = trainee_profiles.user_id and r.psychologist_id = (select auth.uid())
  ));

create policy "Trainees update their own trainee profile"
  on public.trainee_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- psychologist_profiles -------------------------------------------------------

grant select on public.psychologist_profiles to anon, authenticated;
grant update (
  display_name,
  headline,
  bio,
  qualifications,
  specialties,
  languages,
  consultation_formats,
  country,
  years_experience,
  accepting_requests,
  published,
  onboarding_completed_at
) on public.psychologist_profiles to authenticated;

create policy "Anyone reads published professionals"
  on public.psychologist_profiles for select to anon, authenticated
  using (published);

create policy "Psychologists read their own profile"
  on public.psychologist_profiles for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Trainees read their assigned professional"
  on public.psychologist_profiles for select to authenticated
  using (exists (
    select 1 from public.assessment_requests r
    where r.psychologist_id = psychologist_profiles.user_id and r.trainee_id = (select auth.uid())
  ));

create policy "Psychologists update their own profile"
  on public.psychologist_profiles for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- assessment_requests: read-only for clients, written by workflow functions ---

grant select on public.assessment_requests to authenticated;

create policy "Participants read their requests"
  on public.assessment_requests for select to authenticated
  using ((select auth.uid()) in (trainee_id, psychologist_id));

-- consents --------------------------------------------------------------------

grant select on public.consents to authenticated;

create policy "Trainees read their own consents"
  on public.consents for select to authenticated
  using (trainee_id = (select auth.uid()));

-- demo_questionnaire_submissions ----------------------------------------------

grant select on public.demo_questionnaire_submissions to authenticated;

create policy "Trainees read their own submissions"
  on public.demo_questionnaire_submissions for select to authenticated
  using (trainee_id = (select auth.uid()));

create policy "Assigned psychologists read active submissions"
  on public.demo_questionnaire_submissions for select to authenticated
  using (
    app_private.is_request_psychologist(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['questionnaire_submitted', 'in_review', 'report_released']::public.assessment_status[]
    )
  );

-- professional_recommendations ------------------------------------------------

grant select, delete on public.professional_recommendations to authenticated;
grant insert (assessment_request_id, competency, recommendation_text, educational_summary)
  on public.professional_recommendations to authenticated;
grant update (competency, recommendation_text, educational_summary)
  on public.professional_recommendations to authenticated;

create policy "Assigned psychologists read recommendations"
  on public.professional_recommendations for select to authenticated
  using (app_private.is_request_psychologist(assessment_request_id));

create policy "Trainees read recommendations after release"
  on public.professional_recommendations for select to authenticated
  using (
    app_private.is_request_trainee(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['report_released']::public.assessment_status[]
    )
  );

create policy "Assigned psychologists add recommendations during review"
  on public.professional_recommendations for insert to authenticated
  with check (
    app_private.is_request_psychologist(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['in_review']::public.assessment_status[]
    )
  );

create policy "Assigned psychologists edit recommendations during review"
  on public.professional_recommendations for update to authenticated
  using (
    app_private.is_request_psychologist(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['in_review']::public.assessment_status[]
    )
  )
  with check (app_private.is_request_psychologist(assessment_request_id));

create policy "Assigned psychologists delete recommendations during review"
  on public.professional_recommendations for delete to authenticated
  using (
    app_private.is_request_psychologist(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['in_review']::public.assessment_status[]
    )
  );

-- assessment_private_notes ----------------------------------------------------

grant select, delete on public.assessment_private_notes to authenticated;
grant insert (assessment_request_id, body) on public.assessment_private_notes to authenticated;
grant update (body) on public.assessment_private_notes to authenticated;

create policy "Assigned psychologists manage private notes"
  on public.assessment_private_notes for all to authenticated
  using (app_private.is_request_psychologist(assessment_request_id))
  with check (app_private.is_request_psychologist(assessment_request_id));

-- professional_reports --------------------------------------------------------

grant select on public.professional_reports to authenticated;
grant insert (assessment_request_id, title, body, storage_path)
  on public.professional_reports to authenticated;
grant update (title, body, storage_path) on public.professional_reports to authenticated;

create policy "Assigned psychologists read reports"
  on public.professional_reports for select to authenticated
  using (app_private.is_request_psychologist(assessment_request_id));

create policy "Trainees read released reports"
  on public.professional_reports for select to authenticated
  using (released_at is not null and app_private.is_request_trainee(assessment_request_id));

create policy "Assigned psychologists draft reports during review"
  on public.professional_reports for insert to authenticated
  with check (
    app_private.is_request_psychologist(assessment_request_id)
    and app_private.request_has_status(
      assessment_request_id,
      array['in_review']::public.assessment_status[]
    )
  );

create policy "Assigned psychologists edit unreleased reports"
  on public.professional_reports for update to authenticated
  using (released_at is null and app_private.is_request_psychologist(assessment_request_id))
  with check (app_private.is_request_psychologist(assessment_request_id));

-- learning_scenarios ----------------------------------------------------------

grant select on public.learning_scenarios to authenticated;

create policy "Signed-in users read published scenarios"
  on public.learning_scenarios for select to authenticated
  using (published);

-- development plans: written by the save_development_plan function ------------

grant select on public.development_plans to authenticated;
grant select on public.development_plan_sources to authenticated;
grant select on public.development_plan_items to authenticated;
grant update (completed_at) on public.development_plan_items to authenticated;

create policy "Trainees read their own plans"
  on public.development_plans for select to authenticated
  using (trainee_id = (select auth.uid()));

create policy "Trainees read their own plan sources"
  on public.development_plan_sources for select to authenticated
  using (exists (
    select 1 from public.development_plans p
    where p.id = development_plan_sources.plan_id and p.trainee_id = (select auth.uid())
  ));

create policy "Trainees read their own plan items"
  on public.development_plan_items for select to authenticated
  using (exists (
    select 1 from public.development_plans p
    where p.id = development_plan_items.plan_id and p.trainee_id = (select auth.uid())
  ));

create policy "Trainees mark their own plan items"
  on public.development_plan_items for update to authenticated
  using (exists (
    select 1 from public.development_plans p
    where p.id = development_plan_items.plan_id and p.trainee_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.development_plans p
    where p.id = development_plan_items.plan_id and p.trainee_id = (select auth.uid())
  ));

-- scenario_attempts -----------------------------------------------------------

grant select on public.scenario_attempts to authenticated;
grant insert (scenario_id, trainee_id, plan_item_id, choices, completed_at)
  on public.scenario_attempts to authenticated;
grant update (choices, completed_at) on public.scenario_attempts to authenticated;

create policy "Trainees read their own attempts"
  on public.scenario_attempts for select to authenticated
  using (trainee_id = (select auth.uid()));

create policy "Trainees start their own attempts"
  on public.scenario_attempts for insert to authenticated
  with check (
    trainee_id = (select auth.uid())
    and exists (
      select 1 from public.trainee_profiles t where t.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.learning_scenarios s
      where s.id = scenario_attempts.scenario_id and s.published
    )
    and (
      plan_item_id is null
      or exists (
        select 1
        from public.development_plan_items i
        join public.development_plans p on p.id = i.plan_id
        where i.id = scenario_attempts.plan_item_id and p.trainee_id = (select auth.uid())
      )
    )
  );

create policy "Trainees update their unfinished attempts"
  on public.scenario_attempts for update to authenticated
  using (trainee_id = (select auth.uid()) and completed_at is null)
  with check (trainee_id = (select auth.uid()));

-- audit_events: no grants and no policies, so clients have no access at all.
