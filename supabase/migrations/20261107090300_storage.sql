-- Private report files, stored as <assessment_request_id>/<file name>.pdf.
-- Files are downloaded through short-lived signed URLs, never public links.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reports', 'reports', false, 10485760, array['application/pdf']);

create function app_private.report_file_request_id(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then split_part(p_name, '/', 1)::uuid
  end;
$$;

create function app_private.can_read_report_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_request_psychologist(app_private.report_file_request_id(p_name))
    or (
      app_private.is_request_trainee(app_private.report_file_request_id(p_name))
      and exists (
        select 1 from public.professional_reports r
        where r.assessment_request_id = app_private.report_file_request_id(p_name)
          and r.storage_path = p_name
          and r.released_at is not null
      )
    );
$$;

create function app_private.can_write_report_file(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    app_private.is_request_psychologist(app_private.report_file_request_id(p_name))
    and app_private.request_has_status(
      app_private.report_file_request_id(p_name),
      array['in_review']::public.assessment_status[]
    );
$$;

revoke all on function app_private.report_file_request_id(text) from public, anon, authenticated;
revoke all on function app_private.can_read_report_file(text) from public, anon, authenticated;
revoke all on function app_private.can_write_report_file(text) from public, anon, authenticated;
grant execute on function app_private.report_file_request_id(text) to authenticated;
grant execute on function app_private.can_read_report_file(text) to authenticated;
grant execute on function app_private.can_write_report_file(text) to authenticated;

create policy "Report files are readable by permitted users"
  on storage.objects for select to authenticated
  using (bucket_id = 'reports' and app_private.can_read_report_file(name));

create policy "Assigned psychologists upload report files during review"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and app_private.can_write_report_file(name));

create policy "Assigned psychologists delete report files during review"
  on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and app_private.can_write_report_file(name));
