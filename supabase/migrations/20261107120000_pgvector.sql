-- Vector search for the AI Learning Companion. Supabase already has this schema.

create schema if not exists extensions;
create extension if not exists vector with schema extensions;
grant usage on schema extensions to anon, authenticated;
