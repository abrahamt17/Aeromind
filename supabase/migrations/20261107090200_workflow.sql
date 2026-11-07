-- Workflow functions. These are the only way clients change assessment status,
-- consent, approvals, report release and development plans. Each one identifies
-- the caller from auth.uid() and checks the current state in a single transaction.

create function app_private.require_role(p_role public.user_role)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.role = p_role
  ) then
    raise exception 'This action is not available for your account' using errcode = '42501';
  end if;

  return v_user_id;
end;
$$;

create function app_private.log_event(
  p_event_type text,
  p_entity_type text,
  p_entity_id uuid,
  p_metadata jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_events (actor_id, event_type, entity_type, entity_id, metadata)
  values (auth.uid(), p_event_type, p_entity_type, p_entity_id, p_metadata);
$$;

-- Locks the request so concurrent actions cannot both pass the status check.
create function app_private.lock_request_for_trainee(p_request_id uuid, p_trainee_id uuid)
returns public.assessment_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.assessment_requests;
begin
  select * into v_request
  from public.assessment_requests r
  where r.id = p_request_id and r.trainee_id = p_trainee_id
  for update;

  if not found then
    raise exception 'Assessment request not found' using errcode = '42501';
  end if;

  return v_request;
end;
$$;

create function app_private.lock_request_for_psychologist(p_request_id uuid, p_psychologist_id uuid)
returns public.assessment_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.assessment_requests;
begin
  select * into v_request
  from public.assessment_requests r
  where r.id = p_request_id and r.psychologist_id = p_psychologist_id
  for update;

  if not found then
    raise exception 'Assessment request not found' using errcode = '42501';
  end if;

  return v_request;
end;
$$;

-- Trainee actions -------------------------------------------------------------

create function public.request_assessment(
  p_psychologist_id uuid,
  p_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_request_id uuid;
begin
  if not exists (
    select 1 from public.psychologist_profiles p
    where p.user_id = p_psychologist_id and p.published and p.accepting_requests
  ) then
    raise exception 'This professional is not accepting requests';
  end if;

  insert into public.assessment_requests (trainee_id, psychologist_id, trainee_message)
  values (v_trainee_id, p_psychologist_id, nullif(btrim(p_message), ''))
  returning id into v_request_id;

  perform app_private.log_event('assessment.requested', 'assessment_request', v_request_id);
  return v_request_id;
end;
$$;

create function public.cancel_assessment_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_request public.assessment_requests := app_private.lock_request_for_trainee(p_request_id, v_trainee_id);
begin
  if v_request.status not in ('requested', 'accepted', 'questionnaire_submitted') then
    raise exception 'This request can no longer be cancelled';
  end if;

  update public.assessment_requests set status = 'cancelled' where id = p_request_id;
  perform app_private.log_event('assessment.cancelled', 'assessment_request', p_request_id);
end;
$$;

create function public.grant_consent(
  p_request_id uuid,
  p_purpose public.consent_purpose,
  p_policy_version text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_request public.assessment_requests := app_private.lock_request_for_trainee(p_request_id, v_trainee_id);
  v_consent_id uuid;
begin
  if v_request.status in ('declined', 'cancelled') then
    raise exception 'This request is closed';
  end if;

  select c.id into v_consent_id
  from public.consents c
  where c.assessment_request_id = p_request_id and c.purpose = p_purpose and c.withdrawn_at is null;

  if v_consent_id is not null then
    return v_consent_id;
  end if;

  insert into public.consents (trainee_id, assessment_request_id, purpose, policy_version)
  values (v_trainee_id, p_request_id, p_purpose, p_policy_version)
  returning id into v_consent_id;

  perform app_private.log_event(
    'consent.granted', 'assessment_request', p_request_id,
    jsonb_build_object('purpose', p_purpose, 'policy_version', p_policy_version)
  );
  return v_consent_id;
end;
$$;

create function public.withdraw_consent(
  p_request_id uuid,
  p_purpose public.consent_purpose
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_request public.assessment_requests := app_private.lock_request_for_trainee(p_request_id, v_trainee_id);
begin
  update public.consents c
  set withdrawn_at = now()
  where c.assessment_request_id = v_request.id
    and c.purpose = p_purpose
    and c.withdrawn_at is null;

  if found then
    perform app_private.log_event(
      'consent.withdrawn', 'assessment_request', p_request_id,
      jsonb_build_object('purpose', p_purpose)
    );
  end if;
end;
$$;

create function public.submit_demo_questionnaire(
  p_request_id uuid,
  p_questionnaire_version text,
  p_responses jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_request public.assessment_requests := app_private.lock_request_for_trainee(p_request_id, v_trainee_id);
  v_submission_id uuid;
begin
  if v_request.status <> 'accepted' then
    raise exception 'The questionnaire is not open for this request';
  end if;

  if not exists (
    select 1 from public.consents c
    where c.assessment_request_id = p_request_id
      and c.purpose = 'questionnaire_processing'
      and c.withdrawn_at is null
  ) then
    raise exception 'Consent is required before submitting the questionnaire';
  end if;

  insert into public.demo_questionnaire_submissions (
    assessment_request_id, trainee_id, questionnaire_version, responses
  )
  values (p_request_id, v_trainee_id, p_questionnaire_version, p_responses)
  returning id into v_submission_id;

  update public.assessment_requests set status = 'questionnaire_submitted' where id = p_request_id;
  perform app_private.log_event('questionnaire.submitted', 'assessment_request', p_request_id);
  return v_submission_id;
end;
$$;

-- Psychologist actions --------------------------------------------------------

create function public.respond_to_assessment_request(p_request_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_psychologist_id uuid := app_private.require_role('psychologist');
  v_request public.assessment_requests := app_private.lock_request_for_psychologist(p_request_id, v_psychologist_id);
begin
  if v_request.status <> 'requested' then
    raise exception 'This request has already been answered';
  end if;

  update public.assessment_requests
  set status = case when p_accept then 'accepted'::public.assessment_status else 'declined'::public.assessment_status end
  where id = p_request_id;

  perform app_private.log_event(
    case when p_accept then 'assessment.accepted' else 'assessment.declined' end,
    'assessment_request', p_request_id
  );
end;
$$;

create function public.begin_assessment_review(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_psychologist_id uuid := app_private.require_role('psychologist');
  v_request public.assessment_requests := app_private.lock_request_for_psychologist(p_request_id, v_psychologist_id);
begin
  if v_request.status <> 'questionnaire_submitted' then
    raise exception 'This request is not ready for review';
  end if;

  update public.assessment_requests set status = 'in_review' where id = p_request_id;
  perform app_private.log_event('assessment.review_started', 'assessment_request', p_request_id);
end;
$$;

create function public.set_recommendation_ai_approval(
  p_recommendation_id uuid,
  p_approved boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_psychologist_id uuid := app_private.require_role('psychologist');
  v_request_id uuid;
  v_request public.assessment_requests;
begin
  select r.assessment_request_id into v_request_id
  from public.professional_recommendations r
  where r.id = p_recommendation_id;

  if v_request_id is null then
    raise exception 'Recommendation not found' using errcode = '42501';
  end if;

  v_request := app_private.lock_request_for_psychologist(v_request_id, v_psychologist_id);

  if v_request.status <> 'in_review' then
    raise exception 'Recommendations can only change during review';
  end if;

  update public.professional_recommendations
  set
    approved_for_ai = p_approved,
    approved_by = case when p_approved then v_psychologist_id end,
    approved_at = case when p_approved then now() end
  where id = p_recommendation_id;

  perform app_private.log_event(
    case when p_approved then 'recommendation.approved_for_ai' else 'recommendation.approval_removed' end,
    'professional_recommendation', p_recommendation_id
  );
end;
$$;

create function public.release_report(p_report_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_psychologist_id uuid := app_private.require_role('psychologist');
  v_request_id uuid;
  v_request public.assessment_requests;
begin
  select r.assessment_request_id into v_request_id
  from public.professional_reports r
  where r.id = p_report_id;

  if v_request_id is null then
    raise exception 'Report not found' using errcode = '42501';
  end if;

  v_request := app_private.lock_request_for_psychologist(v_request_id, v_psychologist_id);

  if v_request.status <> 'in_review' then
    raise exception 'This report cannot be released at this stage';
  end if;

  update public.professional_reports set released_at = now() where id = p_report_id;
  update public.assessment_requests set status = 'report_released' where id = v_request_id;
  perform app_private.log_event('report.released', 'professional_report', p_report_id);
end;
$$;

-- AI development plans --------------------------------------------------------

-- Shared gate for reading AI input and saving a plan.
create function app_private.assert_plan_allowed(p_request_id uuid, p_trainee_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.assessment_requests := app_private.lock_request_for_trainee(p_request_id, p_trainee_id);
begin
  if v_request.status <> 'report_released' then
    raise exception 'A development plan is available after your report is released';
  end if;

  if not exists (
    select 1 from public.consents c
    where c.assessment_request_id = p_request_id
      and c.purpose = 'ai_development_plan'
      and c.withdrawn_at is null
  ) then
    raise exception 'Consent is required before generating a development plan';
  end if;
end;
$$;

-- The complete, deliberately narrow input for AI generation. Adding a field here
-- sends it to the AI provider, so it must never include identifiers, questionnaire
-- responses, report content or private notes.
create function public.get_plan_generation_input(p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_trainee_id uuid := app_private.require_role('trainee');
  v_result jsonb;
begin
  perform app_private.assert_plan_allowed(p_request_id, v_trainee_id);

  select jsonb_build_object(
    'training_stage', t.training_stage,
    'language', t.preferred_language,
    'recommendations', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', r.id,
          'competency', r.competency,
          'educational_summary', r.educational_summary
        )
        order by r.created_at
      )
      from public.professional_recommendations r
      where r.assessment_request_id = p_request_id and r.approved_for_ai
    ), '[]'::jsonb)
  )
  into v_result
  from public.trainee_profiles t
  where t.user_id = v_trainee_id;

  return v_result;
end;
$$;

create function public.save_development_plan(
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

  insert into public.development_plan_items (plan_id, position, item_type, title, description, scenario_id)
  select
    v_plan_id,
    (i.ordinality - 1)::integer,
    (i.value ->> 'item_type')::public.plan_item_type,
    i.value ->> 'title',
    i.value ->> 'description',
    (i.value ->> 'scenario_id')::uuid
  from jsonb_array_elements(p_items) with ordinality as i;

  perform app_private.log_event(
    'development_plan.generated', 'development_plan', v_plan_id,
    jsonb_build_object('source_count', v_source_count, 'model', p_model)
  );
  return v_plan_id;
end;
$$;

-- Execution rights ------------------------------------------------------------

revoke all on all functions in schema public from public, anon, authenticated;
revoke all on all functions in schema app_private from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

grant execute on function app_private.is_request_trainee(uuid) to authenticated;
grant execute on function app_private.is_request_psychologist(uuid) to authenticated;
grant execute on function app_private.request_has_status(uuid, public.assessment_status[]) to authenticated;

grant execute on function public.request_assessment(uuid, text) to authenticated;
grant execute on function public.cancel_assessment_request(uuid) to authenticated;
grant execute on function public.grant_consent(uuid, public.consent_purpose, text) to authenticated;
grant execute on function public.withdraw_consent(uuid, public.consent_purpose) to authenticated;
grant execute on function public.submit_demo_questionnaire(uuid, text, jsonb) to authenticated;
grant execute on function public.respond_to_assessment_request(uuid, boolean) to authenticated;
grant execute on function public.begin_assessment_review(uuid) to authenticated;
grant execute on function public.set_recommendation_ai_approval(uuid, boolean) to authenticated;
grant execute on function public.release_report(uuid) to authenticated;
grant execute on function public.get_plan_generation_input(uuid) to authenticated;
grant execute on function public.save_development_plan(uuid, text, text, text, text, uuid[], jsonb) to authenticated;
