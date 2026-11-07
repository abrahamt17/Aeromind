-- Learning progress, quizzes, saved resources and scenario links.
-- Answer keys sit apart from questions so no client can read them before answering.

alter table public.learning_scenarios
  add column lesson_id uuid references public.lessons (id) on delete set null,
  add column review_status public.content_review_status not null default 'draft';

create index learning_scenarios_lesson_idx on public.learning_scenarios (lesson_id);

-- Records which version of the demo catalogue a database holds.
create table app_private.seed_state (
  name text primary key,
  version integer not null,
  updated_at timestamptz not null default now()
);

revoke all on app_private.seed_state from public;

create table public.lesson_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  completed_at timestamptz,
  primary key (user_id, lesson_id)
);

create index lesson_progress_recent_idx on public.lesson_progress (user_id, last_viewed_at desc);
create index lesson_progress_lesson_idx on public.lesson_progress (lesson_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position integer not null check (position >= 0),
  prompt text not null check (char_length(prompt) between 1 and 500),
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  unique (lesson_id, position)
);

create table public.quiz_answer_keys (
  question_id uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_option_id text not null check (char_length(correct_option_id) between 1 and 20),
  explanation text not null check (char_length(explanation) between 1 and 1000)
);

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  answers jsonb not null check (jsonb_typeof(answers) = 'object'),
  score integer not null check (score >= 0),
  total integer not null check (total > 0),
  created_at timestamptz not null default now(),
  constraint score_within_total check (score <= total)
);

create index quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);
create index quiz_attempts_lesson_idx on public.quiz_attempts (lesson_id);

create table public.saved_resources (
  user_id uuid not null references public.profiles (id) on delete cascade,
  resource_id uuid not null references public.learning_resources (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, resource_id)
);

create index saved_resources_resource_idx on public.saved_resources (resource_id);

-- Row Level Security ----------------------------------------------------------

alter table public.lesson_progress enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answer_keys enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.saved_resources enable row level security;

grant select on public.lesson_progress to authenticated;
grant select on public.quiz_questions to anon, authenticated;
grant select on public.quiz_attempts to authenticated;
grant select, delete on public.saved_resources to authenticated;
grant insert (user_id, resource_id) on public.saved_resources to authenticated;
-- quiz_answer_keys: no grants and no policies, so clients have no access at all.

create policy "Users read their own lesson progress"
  on public.lesson_progress for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Lesson readers see its questions"
  on public.quiz_questions for select to anon, authenticated
  using (app_private.can_read_lesson(lesson_id));

create policy "Users read their own quiz attempts"
  on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users read their own saved resources"
  on public.saved_resources for select to authenticated
  using (user_id = (select auth.uid()));

-- The resource must be visible to the user, so hidden ids cannot be probed.
create policy "Users save resources they can read"
  on public.saved_resources for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.learning_resources r where r.id = saved_resources.resource_id)
  );

create policy "Users remove their own saved resources"
  on public.saved_resources for delete to authenticated
  using (user_id = (select auth.uid()));

-- Functions -------------------------------------------------------------------

create function app_private.enrolled_in_lesson_course(p_lesson_id uuid)
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
    where l.id = p_lesson_id and l.is_available and app_private.is_enrolled(m.course_id)
  );
$$;

-- Preview readers who are not enrolled are not tracked.
create function public.record_lesson_view(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
begin
  if not app_private.enrolled_in_lesson_course(p_lesson_id) then
    return;
  end if;

  insert into public.lesson_progress (user_id, lesson_id)
  values (v_user_id, p_lesson_id)
  on conflict (user_id, lesson_id) do update set last_viewed_at = now();
end;
$$;

create function public.set_lesson_completion(p_lesson_id uuid, p_completed boolean)
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
end;
$$;

-- The only way to mark answers. Keys leave the database only after a full attempt.
create function public.submit_quiz(p_lesson_id uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
  v_total integer;
  v_answered integer;
  v_score integer;
  v_results jsonb;
begin
  if not app_private.can_read_lesson(p_lesson_id) then
    raise exception 'This quiz is not available' using errcode = '42501';
  end if;

  if jsonb_typeof(p_answers) <> 'object' then
    raise exception 'Answer every question before submitting';
  end if;

  select
    count(*),
    count(*) filter (where p_answers ->> q.id::text is not null),
    count(*) filter (where p_answers ->> q.id::text = k.correct_option_id),
    jsonb_agg(
      jsonb_build_object(
        'question_id', q.id,
        'selected_option_id', p_answers ->> q.id::text,
        'correct_option_id', k.correct_option_id,
        'is_correct', p_answers ->> q.id::text = k.correct_option_id,
        'explanation', k.explanation
      )
      order by q.position
    )
  into v_total, v_answered, v_score, v_results
  from public.quiz_questions q
  join public.quiz_answer_keys k on k.question_id = q.id
  where q.lesson_id = p_lesson_id;

  if v_total = 0 then
    raise exception 'This lesson has no quiz';
  end if;

  if v_answered <> v_total then
    raise exception 'Answer every question before submitting';
  end if;

  insert into public.quiz_attempts (user_id, lesson_id, answers, score, total)
  values (v_user_id, p_lesson_id, p_answers, v_score, v_total);

  return jsonb_build_object('score', v_score, 'total', v_total, 'results', v_results);
end;
$$;

-- Execution rights ------------------------------------------------------------

revoke all on function app_private.enrolled_in_lesson_course(uuid) from public, anon, authenticated;
revoke all on function public.record_lesson_view(uuid) from public, anon, authenticated;
revoke all on function public.set_lesson_completion(uuid, boolean) from public, anon, authenticated;
revoke all on function public.submit_quiz(uuid, jsonb) from public, anon, authenticated;

grant execute on function public.record_lesson_view(uuid) to authenticated;
grant execute on function public.set_lesson_completion(uuid, boolean) to authenticated;
grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;
