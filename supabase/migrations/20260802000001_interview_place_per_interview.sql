-- Migration: anche i colloqui in presenza possono avere un luogo diverso ognuno.
--
-- Il vincolo pretendeva un luogo sulla sessione per ogni round in presenza. Ma
-- un'associazione può voler dire l'aula caso per caso, esattamente come fa col
-- link online: link_mode = 'per_interview' vale ora per entrambe le modalità, e
-- il posto arriva dopo la prenotazione.
--
-- Tolta anche parallel_tracks dal percorso di creazione (resta la colonna a 1):
-- "quanti colloqui in parallelo" non si capiva, e chi fa un colloquio ne fa uno.

alter table interview_sessions drop constraint if exists interview_sessions_place_present;

alter table interview_sessions
  add constraint interview_sessions_place_present check (
    status = 'draft'
    or link_mode = 'per_interview'
    or (mode = 'in_person' and location is not null and length(trim(location)) > 0)
    or (mode = 'online' and meeting_link is not null and length(trim(meeting_link)) > 0)
  );

comment on column interview_sessions.link_mode is
  'shared = un solo posto per tutti (link o aula sulla sessione). per_interview = il posto lo mette chi conduce dopo la prenotazione, colloquio per colloquio.';

comment on column interview_sessions.parallel_tracks is
  'Colloqui in contemporanea. Non piu'' impostabile dall''interfaccia: resta 1.';
