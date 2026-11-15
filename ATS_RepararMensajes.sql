begin;

drop policy if exists application_messages_participant_read on public.application_messages;
create policy application_messages_participant_read
on public.application_messages
for select to authenticated
using (
    exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        join public.companies c on c.id = j.company_id
        where a.id = application_messages.application_id
          and (
              c.user_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
              or a.candidate_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
          )
    )
);

drop policy if exists application_messages_participant_insert on public.application_messages;
create policy application_messages_participant_insert
on public.application_messages
for insert to authenticated
with check (
    sender_user_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
    and exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        join public.companies c on c.id = j.company_id
        where a.id = application_messages.application_id
          and (
              c.user_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
              or a.candidate_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
          )
    )
);

drop policy if exists application_messages_participant_update on public.application_messages;
create policy application_messages_participant_update
on public.application_messages
for update to authenticated
using (
    exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        join public.companies c on c.id = j.company_id
        where a.id = application_messages.application_id
          and (
              c.user_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
              or a.candidate_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
          )
    )
)
with check (
    exists (
        select 1
        from public.applications a
        join public.jobs j on j.id = a.job_id
        join public.companies c on c.id = j.company_id
        where a.id = application_messages.application_id
          and (
              c.user_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
              or a.candidate_id = (select u.id from public.users u where u.auth_user_id = auth.uid())
          )
    )
);

commit;
