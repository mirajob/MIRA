-- Migration: libretto del corso precedente.
--
-- Chi è appena passato alla magistrale ha pochi esami nel corso attuale e tre anni di esami
-- nella triennale. Da qui può caricare entrambi i libretti: i due elenchi convivono, distinti
-- dalla fase del corso. Senza questa colonna il secondo caricamento cancellerebbe gli esami
-- del primo (uploadTranscript sostituisce sempre l'intero elenco, perché un libretto è
-- cumulativo e il merge produrrebbe duplicati).

alter table student_courses
  add column if not exists phase text not null default 'current';

alter table student_transcripts
  add column if not exists phase text not null default 'current';

comment on column student_courses.phase is 'current = corso attuale, previous = corso precedente (es. la triennale di uno studente magistrale)';
comment on column student_transcripts.phase is 'current = corso attuale, previous = corso precedente';

create index if not exists student_courses_phase_idx on student_courses(student_profile_id, phase);
