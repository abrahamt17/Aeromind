-- Links development plan activities to Academy lessons, and keeps both in step.

alter table public.development_plan_items
  add column lesson_id uuid references public.lessons (id) on delete set null,
  add column estimated_minutes integer check (estimated_minutes between 1 and 240);

create index development_plan_items_lesson_idx on public.development_plan_items (lesson_id);

create or replace function public.save_development_plan(
  p_request_id uuid,
  p_title text,
  p_summary text,
  p_language text,
  p_model text,
  p_recommendation_ids uuid[],
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_plan_id uuid;
  v_source_count integer := coalesce(cardinality(p_recommendation_ids), 0);
begin
  perform app_private.assert_plan_allowed(p_request_id, v_trainee_id);

  if v_source_count = 0
    or v_source_count <> (
      select count(distinct r.id)
      from public.professional_recommendations r
      where r.id = any (p_recommendation_ids)
        and r.assessment_request_id = p_request_id
        and r.approved_for_ai
    )
  then
    raise exception 'A plan can only use recommendations approved by your professional';
  end if;

  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'A plan needs at least one item';
  end if;

  insert into public.development_plans (
    assessment_request_id, trainee_id, title, summary, language, model
  )
  values (p_request_id, v_trainee_id, p_title, p_summary, p_language, p_model)
  returning id into v_plan_id;

  insert into public.development_plan_sources (plan_id, recommendation_id)
  select v_plan_id, unnest(p_recommendation_ids);

  insert into public.development_plan_items (
    plan_id, position, item_type, title, description, scenario_id, lesson_id, estimated_minutes
  )
  select
    v_plan_id,
    (i.ordinality - 1)::integer,
    (i.value ->> 'item_type')::public.plan_item_type,
    i.value ->> 'title',
    i.value ->> 'description',
    (i.value ->> 'scenario_id')::uuid,
    (i.value ->> 'lesson_id')::uuid,
    (i.value ->> 'estimated_minutes')::integer
  from jsonb_array_elements(p_items) with ordinality as i;

  perform app_private.log_event(
    'development_plan.generated', 'development_plan', v_plan_id,
    jsonb_build_object('source_count', v_source_count, 'model', p_model)
  );
  return v_plan_id;
end;
$$;

-- Completing a lesson also completes any plan activity that points to it.
create or replace function public.set_lesson_completion(p_lesson_id uuid, p_completed boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
begin
  if not app_private.enrolled_in_lesson_course(p_lesson_id) then
    raise exception 'Enrol in this course to track your progress' using errcode = '42501';
  end if;

  insert into public.lesson_progress (user_id, lesson_id, completed_at)
  values (v_user_id, p_lesson_id, case when p_completed then now() end)
  on conflict (user_id, lesson_id) do update
    set completed_at = case when p_completed then now() end;

  if p_completed then
    update public.development_plan_items i
    set completed_at = coalesce(i.completed_at, now())
    from public.development_plans p
    where p.id = i.plan_id and p.trainee_id = v_user_id and i.lesson_id = p_lesson_id;
  end if;
end;
$$;
