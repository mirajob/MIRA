-- Migration: ripara i blocchi retrocessi a bozza dal caricamento del libretto.
--
-- Bug: uploadTranscript() riscriveva SEMPRE header e formazione con status 'draft', anche
-- quando erano già confermati. L'unico punto che li riporta ad 'approved' è il Conferma
-- dell'Header, quindi chi ha caricato il libretto dopo quel passaggio (al gate, al passo
-- Competenze, alla chiusura o più tardi dal Profilo) si è ritrovato corso, università, media
-- ed elenco esami invisibili ad associazioni, aziende e admin, che leggono solo i blocchi
-- approvati. Lo studente non poteva accorgersene: sul proprio Profilo vede anche le bozze.
--
-- Il codice non retrocede più (apps/web/src/lib/actions/transcript-upload.ts); qui si
-- recuperano le card già danneggiate.
--
-- Criterio: onboarding_completed = true implica che l'Header è stato confermato almeno una
-- volta, perché è proprio quel Conferma a completare l'onboarding (completeGateFlow). Se oggi
-- risulta in bozza, l'ha retrocesso il libretto.

update card_blocks cb
set status = 'approved',
    approved_at = coalesce(cb.approved_at, now())
from student_profiles sp
where cb.student_profile_id = sp.id
  and sp.onboarding_completed = true
  and cb.block_type = 'header'
  and cb.status <> 'approved';

-- La formazione si approva solo se contiene davvero degli esami: un blocco vuoto approvato
-- non mostrerebbe nulla e sporcherebbe le percentuali di completamento.
update card_blocks cb
set status = 'approved',
    approved_at = coalesce(cb.approved_at, now())
from student_profiles sp
where cb.student_profile_id = sp.id
  and sp.onboarding_completed = true
  and cb.block_type = 'formazione'
  and cb.status <> 'approved'
  and jsonb_typeof(cb.prose_content -> 'items') = 'array'
  and jsonb_array_length(cb.prose_content -> 'items') > 0;
