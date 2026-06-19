-- Migration 008: Row-Level Security policies
-- Based on docs/07_MIRA_SECURITY_PRIVACY.md

-- Helper: check if user is mira_admin
create or replace function is_mira_admin(check_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from global_role_assignments
    where user_id = check_user_id and role = 'mira_admin'
  );
$$ language sql security definer stable;

-- Helper: check association membership
create or replace function is_association_member(check_user_id uuid, check_association_id uuid)
returns boolean as $$
  select exists (
    select 1 from association_memberships
    where user_id = check_user_id
      and association_id = check_association_id
      and status = 'active'
  );
$$ language sql security definer stable;

-- Helper: check specific association permission
create or replace function has_association_permission(
  check_user_id uuid,
  check_association_id uuid,
  permission_key text
)
returns boolean as $$
  select exists (
    select 1 from association_memberships
    where user_id = check_user_id
      and association_id = check_association_id
      and status = 'active'
      and (
        role = 'association_president'
        or (permissions->permission_key)::boolean = true
      )
  );
$$ language sql security definer stable;

-- Helper: get profile id from auth
create or replace function get_profile_id()
returns uuid as $$
  select id from profiles where auth_user_id = auth.uid();
$$ language sql security definer stable;

------------------------------------------------------------
-- PROFILES
------------------------------------------------------------

create policy "Users can read own profile"
  on profiles for select
  using (auth_user_id = auth.uid());

create policy "Users can update own profile"
  on profiles for update
  using (auth_user_id = auth.uid());

create policy "Admin can read all profiles"
  on profiles for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- GLOBAL ROLE ASSIGNMENTS
------------------------------------------------------------

create policy "Users can read own roles"
  on global_role_assignments for select
  using (user_id = get_profile_id());

create policy "Admin can manage roles"
  on global_role_assignments for all
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- STUDENT PROFILES
------------------------------------------------------------

create policy "Students can read own student profile"
  on student_profiles for select
  using (user_id = get_profile_id());

create policy "Students can update own student profile"
  on student_profiles for update
  using (user_id = get_profile_id());

create policy "Students can insert own student profile"
  on student_profiles for insert
  with check (user_id = get_profile_id());

create policy "Admin can read all student profiles"
  on student_profiles for select
  using (is_mira_admin(get_profile_id()));

create policy "Association reviewers can read candidate student profiles"
  on student_profiles for select
  using (
    exists (
      select 1 from applications a
      join association_memberships am on am.association_id = a.association_id
      where a.student_profile_id = student_profiles.id
        and am.user_id = get_profile_id()
        and am.status = 'active'
        and (
          am.role = 'association_president'
          or (am.permissions->'view_candidates')::boolean = true
        )
    )
  );

------------------------------------------------------------
-- STUDENT TRANSCRIPTS
------------------------------------------------------------

create policy "Students can manage own transcripts"
  on student_transcripts for all
  using (
    student_profile_id in (
      select id from student_profiles where user_id = get_profile_id()
    )
  );

create policy "Admin can read all transcripts"
  on student_transcripts for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- STUDENT COURSES
------------------------------------------------------------

create policy "Students can read own courses"
  on student_courses for select
  using (
    student_profile_id in (
      select id from student_profiles where user_id = get_profile_id()
    )
  );

create policy "Admin can read all courses"
  on student_courses for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- ASSOCIATION PROFILES
------------------------------------------------------------

create policy "Anyone can read published associations"
  on association_profiles for select
  using (public_page_status = 'published');

create policy "Members can read own association"
  on association_profiles for select
  using (is_association_member(get_profile_id(), id));

create policy "Admin can read all associations"
  on association_profiles for select
  using (is_mira_admin(get_profile_id()));

create policy "Authorized members can update association"
  on association_profiles for update
  using (has_association_permission(get_profile_id(), id, 'manage_association_profile'));

create policy "Admin can update any association"
  on association_profiles for update
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- ASSOCIATION MEMBERSHIPS
------------------------------------------------------------

create policy "Members can read own association memberships"
  on association_memberships for select
  using (
    user_id = get_profile_id()
    or has_association_permission(get_profile_id(), association_id, 'view_board_members')
  );

create policy "Admin can read all memberships"
  on association_memberships for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- INVITATIONS
------------------------------------------------------------

create policy "Invitees can read own invitations"
  on invitations for select
  using (
    invited_email = (select email from profiles where auth_user_id = auth.uid())
  );

create policy "Admin can manage all invitations"
  on invitations for all
  using (is_mira_admin(get_profile_id()));

create policy "Presidents can manage board invitations"
  on invitations for all
  using (
    invitation_type = 'association_board_member'
    and has_association_permission(get_profile_id(), association_id, 'invite_board_members')
  );

------------------------------------------------------------
-- APPLICATION CYCLES
------------------------------------------------------------

create policy "Anyone can read open cycles"
  on application_cycles for select
  using (status = 'open');

create policy "Association members can read own cycles"
  on application_cycles for select
  using (is_association_member(get_profile_id(), association_id));

create policy "Authorized members can manage cycles"
  on application_cycles for all
  using (has_association_permission(get_profile_id(), association_id, 'manage_application_cycles'));

create policy "Admin can manage all cycles"
  on application_cycles for all
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- APPLICATION QUESTIONS
------------------------------------------------------------

create policy "Anyone can read questions for open cycles"
  on application_questions for select
  using (
    application_cycle_id in (
      select id from application_cycles where status = 'open'
    )
  );

create policy "Association members can read own questions"
  on application_questions for select
  using (
    application_cycle_id in (
      select id from application_cycles
      where is_association_member(get_profile_id(), association_id)
    )
  );

create policy "Authorized members can manage questions"
  on application_questions for all
  using (
    application_cycle_id in (
      select id from application_cycles
      where has_association_permission(get_profile_id(), association_id, 'manage_application_questions')
    )
  );

------------------------------------------------------------
-- APPLICATIONS
------------------------------------------------------------

create policy "Students can read own applications"
  on applications for select
  using (student_user_id = get_profile_id());

create policy "Students can insert own applications"
  on applications for insert
  with check (student_user_id = get_profile_id());

create policy "Students can update own draft applications"
  on applications for update
  using (student_user_id = get_profile_id() and status = 'draft');

create policy "Association reviewers can read candidates"
  on applications for select
  using (has_association_permission(get_profile_id(), association_id, 'view_candidates'));

create policy "Authorized members can update application status"
  on applications for update
  using (has_association_permission(get_profile_id(), association_id, 'change_candidate_status'));

create policy "Admin can read all applications"
  on applications for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- APPLICATION ANSWERS
------------------------------------------------------------

create policy "Students can manage own draft answers"
  on application_answers for all
  using (
    application_id in (
      select id from applications
      where student_user_id = get_profile_id()
    )
  );

create policy "Association reviewers can read answers"
  on application_answers for select
  using (
    application_id in (
      select id from applications
      where has_association_permission(get_profile_id(), association_id, 'view_candidate_answers')
    )
  );

------------------------------------------------------------
-- CANDIDATE AI EVALUATIONS
------------------------------------------------------------

create policy "Authorized members can read AI evaluations"
  on candidate_ai_evaluations for select
  using (
    application_id in (
      select id from applications
      where has_association_permission(get_profile_id(), association_id, 'view_candidate_ai_evaluation')
    )
  );

create policy "Admin can read all AI evaluations"
  on candidate_ai_evaluations for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- APPLICATION STATUS EVENTS
------------------------------------------------------------

create policy "Students can read own status events"
  on application_status_events for select
  using (
    visible_to_candidate = true
    and application_id in (
      select id from applications where student_user_id = get_profile_id()
    )
  );

create policy "Association members can read status events"
  on application_status_events for select
  using (
    application_id in (
      select id from applications
      where has_association_permission(get_profile_id(), association_id, 'view_candidates')
    )
  );

------------------------------------------------------------
-- CANDIDATE INTERNAL NOTES
------------------------------------------------------------

create policy "Authorized members can manage notes"
  on candidate_internal_notes for all
  using (
    application_id in (
      select id from applications
      where has_association_permission(get_profile_id(), association_id, 'add_internal_candidate_notes')
    )
  );

create policy "Admin can read all notes"
  on candidate_internal_notes for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- INTERVIEW INVITES
------------------------------------------------------------

create policy "Candidates can read own interview invites"
  on interview_invites for select
  using (candidate_user_id = get_profile_id());

create policy "Authorized members can manage interviews"
  on interview_invites for all
  using (has_association_permission(get_profile_id(), association_id, 'send_interview_invites'));

------------------------------------------------------------
-- UPLOADED FILES
------------------------------------------------------------

create policy "Users can read own files"
  on uploaded_files for select
  using (owner_user_id = get_profile_id());

create policy "Users can insert own files"
  on uploaded_files for insert
  with check (owner_user_id = get_profile_id());

create policy "Admin can read all files"
  on uploaded_files for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- KNOWLEDGE DOCUMENTS
------------------------------------------------------------

create policy "Admin can manage knowledge documents"
  on knowledge_documents for all
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- KNOWLEDGE CHUNKS
------------------------------------------------------------

create policy "Admin can read knowledge chunks"
  on knowledge_chunks for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- NOTIFICATIONS
------------------------------------------------------------

create policy "Users can read own notifications"
  on notifications for select
  using (user_id = get_profile_id());

create policy "Users can update own notifications"
  on notifications for update
  using (user_id = get_profile_id());

------------------------------------------------------------
-- AUDIT LOGS
------------------------------------------------------------

create policy "Admin can read audit logs"
  on audit_logs for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- AI LOGS
------------------------------------------------------------

create policy "Admin can read AI logs"
  on ai_logs for select
  using (is_mira_admin(get_profile_id()));

------------------------------------------------------------
-- ASSOCIATION ACCESS REQUESTS
------------------------------------------------------------

create policy "Anyone can insert access requests"
  on association_access_requests for insert
  with check (true);

create policy "Admin can manage access requests"
  on association_access_requests for all
  using (is_mira_admin(get_profile_id()));
