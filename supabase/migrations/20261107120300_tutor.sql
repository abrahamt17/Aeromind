-- AI Learning Companion: indexed knowledge, conversations and usage limits.
-- Retrieval runs as the student, so Row Level Security decides what the AI can see.

alter table public.courses
  add column ai_indexing_allowed boolean not null default false;

-- Knowledge -------------------------------------------------------------------

-- Each document is one lesson or one resource, and keeps its source for citations.
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses (id) on delete cascade,
  lesson_id uuid unique references public.lessons (id) on delete cascade,
  resource_id uuid unique references public.learning_resources (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 300),
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_url text check (source_url is null or source_url ~ '^https://'),
  content_hash text not null check (char_length(content_hash) = 64),
  embedding_model text not null check (char_length(embedding_model) between 1 and 80),
  indexed_at timestamptz not null default now(),
  constraint document_has_one_source check (num_nonnulls(lesson_id, resource_id) = 1),
  constraint lesson_document_has_course check (lesson_id is null or course_id is not null)
);

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  course_id uuid references public.courses (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  resource_id uuid references public.learning_resources (id) on delete cascade,
  position integer not null check (position >= 0),
  content text not null check (char_length(content) between 1 and 4000),
  embedding extensions.vector(1536) not null,
  unique (document_id, position)
);

create index knowledge_chunks_course_idx on public.knowledge_chunks (course_id);
create index knowledge_chunks_resource_idx on public.knowledge_chunks (resource_id);

-- An exact search keeps filtered results complete, and the corpus is small.
-- Add an HNSW index only if the catalogue grows beyond a few thousand chunks.

-- Permissions -----------------------------------------------------------------

create function app_private.can_retrieve_knowledge(p_lesson_id uuid, p_resource_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_lesson_id is not null then
      app_private.can_read_lesson(p_lesson_id)
      and exists (
        select 1
        from public.lessons l
        join public.course_modules m on m.id = l.module_id
        join public.courses c on c.id = m.course_id
        where l.id = p_lesson_id and c.ai_indexing_allowed
      )
    when p_resource_id is not null then exists (
      select 1 from public.learning_resources r
      where r.id = p_resource_id
        and r.published
        and r.can_index_ai
        and app_private.can_read_resource(r.id, r.access)
    )
    else false
  end;
$$;

-- A last check that nothing without AI permission can enter the index.
create function app_private.enforce_knowledge_permission()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.resource_id is not null and not exists (
    select 1 from public.learning_resources r
    where r.id = new.resource_id and r.can_index_ai
  ) then
    raise exception 'This resource does not allow AI indexing';
  end if;

  if new.lesson_id is not null and not exists (
    select 1
    from public.lessons l
    join public.course_modules m on m.id = l.module_id
    join public.courses c on c.id = m.course_id
    where l.id = new.lesson_id and c.ai_indexing_allowed
  ) then
    raise exception 'This course does not allow AI indexing';
  end if;

  return new;
end;
$$;

create trigger enforce_knowledge_permission
  before insert or update on public.knowledge_documents
  for each row execute function app_private.enforce_knowledge_permission();

-- Withdrawing permission removes the content from the index straight away.
create function app_private.remove_resource_knowledge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.can_index_ai and not new.can_index_ai then
    delete from public.knowledge_documents d where d.resource_id = new.id;
  end if;
  return new;
end;
$$;

create trigger remove_resource_knowledge
  after update of can_index_ai on public.learning_resources
  for each row execute function app_private.remove_resource_knowledge();

create function app_private.remove_course_knowledge()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.ai_indexing_allowed and not new.ai_indexing_allowed then
    delete from public.knowledge_documents d where d.course_id = new.id;
  end if;
  return new;
end;
$$;

create trigger remove_course_knowledge
  after update of ai_indexing_allowed on public.courses
  for each row execute function app_private.remove_course_knowledge();

-- Conversations ---------------------------------------------------------------

-- One conversation per student and lesson, so returning to a lesson continues it.
create table public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);

create index ai_conversations_lesson_idx on public.ai_conversations (lesson_id);

create table public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 8000),
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  suggested_lessons jsonb not null default '[]' check (jsonb_typeof(suggested_lessons) = 'array'),
  created_at timestamptz not null default now()
);

create index ai_messages_conversation_idx on public.ai_messages (conversation_id, created_at);

create trigger set_updated_at before update on public.ai_conversations
  for each row execute function app_private.set_updated_at();

create table public.ai_usage_daily (
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  requests integer not null default 0 check (requests >= 0),
  primary key (user_id, day)
);

create index ai_usage_daily_day_idx on public.ai_usage_daily (day);

-- Row Level Security ----------------------------------------------------------

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_usage_daily enable row level security;

grant usage on schema app_private to anon;
grant select on public.knowledge_documents to authenticated;
grant select on public.knowledge_chunks to authenticated;
grant select, delete on public.ai_conversations to authenticated;
grant select on public.ai_messages to authenticated;
grant select on public.ai_usage_daily to authenticated;

create policy "Students read knowledge they may access"
  on public.knowledge_documents for select to authenticated
  using (app_private.can_retrieve_knowledge(lesson_id, resource_id));

create policy "Students read chunks they may access"
  on public.knowledge_chunks for select to authenticated
  using (app_private.can_retrieve_knowledge(lesson_id, resource_id));

create policy "Students read their own conversations"
  on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Students delete their own conversations"
  on public.ai_conversations for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "Students read their own messages"
  on public.ai_messages for select to authenticated
  using (exists (
    select 1 from public.ai_conversations c
    where c.id = ai_messages.conversation_id and c.user_id = (select auth.uid())
  ));

create policy "Students read their own usage"
  on public.ai_usage_daily for select to authenticated
  using (user_id = (select auth.uid()));

-- Functions -------------------------------------------------------------------

-- SECURITY INVOKER on purpose: RLS on knowledge_chunks applies to the student.
create function public.search_knowledge(
  p_embedding extensions.vector,
  p_course_id uuid,
  p_limit integer default 5
)
returns table (
  chunk_id uuid,
  content text,
  lesson_id uuid,
  resource_id uuid,
  title text,
  source_name text,
  source_url text,
  distance double precision
)
language sql
stable
set search_path = ''
as $$
  select
    c.id, c.content, c.lesson_id, c.resource_id, d.title, d.source_name, d.source_url,
    c.embedding operator(extensions.<=>) p_embedding
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where c.course_id = p_course_id
    or c.resource_id in (
      select cr.resource_id from public.course_resources cr where cr.course_id = p_course_id
    )
  order by c.embedding operator(extensions.<=>) p_embedding
  limit least(greatest(p_limit, 1), 8);
$$;

-- Limits are passed by the server. Calling this directly only uses up your own quota.
create function public.reserve_tutor_request(p_user_limit integer, p_global_limit integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
  v_day date := (now() at time zone 'utc')::date;
  v_requests integer;
begin
  perform pg_advisory_xact_lock(7204120);

  if (select coalesce(sum(u.requests), 0) from public.ai_usage_daily u where u.day = v_day) >= p_global_limit then
    return false;
  end if;

  insert into public.ai_usage_daily (user_id, day, requests)
  values (v_user_id, v_day, 1)
  on conflict (user_id, day) do update set requests = public.ai_usage_daily.requests + 1
  where public.ai_usage_daily.requests < p_user_limit
  returning requests into v_requests;

  return v_requests is not null and v_requests <= p_user_limit;
end;
$$;

create function public.save_tutor_exchange(
  p_lesson_id uuid,
  p_question text,
  p_answer text,
  p_sources jsonb,
  p_suggested_lessons jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := app_private.require_role('trainee');
  v_conversation_id uuid;
begin
  if not app_private.can_read_lesson(p_lesson_id) then
    raise exception 'This lesson is not available' using errcode = '42501';
  end if;

  insert into public.ai_conversations (user_id, lesson_id)
  values (v_user_id, p_lesson_id)
  on conflict (user_id, lesson_id) do update set updated_at = now()
  returning id into v_conversation_id;

  insert into public.ai_messages (conversation_id, role, content)
  values (v_conversation_id, 'user', p_question);

  insert into public.ai_messages (conversation_id, role, content, sources, suggested_lessons)
  values (v_conversation_id, 'assistant', p_answer, p_sources, p_suggested_lessons);

  return v_conversation_id;
end;
$$;

-- Execution rights ------------------------------------------------------------

revoke all on function app_private.can_retrieve_knowledge(uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.enforce_knowledge_permission() from public, anon, authenticated;
revoke all on function app_private.remove_resource_knowledge() from public, anon, authenticated;
revoke all on function app_private.remove_course_knowledge() from public, anon, authenticated;
revoke all on function public.search_knowledge(extensions.vector, uuid, integer) from public, anon, authenticated;
revoke all on function public.reserve_tutor_request(integer, integer) from public, anon, authenticated;
revoke all on function public.save_tutor_exchange(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;

grant execute on function app_private.can_retrieve_knowledge(uuid, uuid) to authenticated;
grant execute on function public.search_knowledge(extensions.vector, uuid, integer) to authenticated;
grant execute on function public.reserve_tutor_request(integer, integer) to authenticated;
grant execute on function public.save_tutor_exchange(uuid, text, text, jsonb, jsonb) to authenticated;
