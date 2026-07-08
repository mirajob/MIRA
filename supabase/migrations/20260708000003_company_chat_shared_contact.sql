-- Student-controlled selective contact sharing (name/email/phone), replacing
-- the old all-or-nothing "identity reveal" which only ever exposed full_name+email.
alter table company_chats
  add column if not exists shared_contact jsonb;

comment on column company_chats.shared_contact is
  'Contact fields the student chose to share with the company: {name?, email?, phone?}. Null/absent = not shared.';

comment on column company_chats.student_identity_revealed is
  'True once the student has shared at least one contact field via shared_contact.';

-- Notifications need realtime so the bell UI updates live (chat/messages already do this).
do $$ begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
