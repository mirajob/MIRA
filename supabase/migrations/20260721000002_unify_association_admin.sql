-- Migration: un solo livello di gestione nelle associazioni
--
-- Sparisce la distinzione presidente / board / reviewer / interviewer. Restano due
-- soli stati: amministratore (accesso completo alla dashboard) e membro (nessun accesso).
-- Chi crea la pagina nasce amministratore; chi l'ha creata resta comunque tracciato in
-- association_profiles.created_by_user_id.
--
-- I valori dell'enum association_role non vengono rimossi: toglierli richiederebbe di
-- ricreare il tipo e tutte le colonne che lo usano. Semplicemente non sono piu' assegnati.
--
-- NOTA: questa conversione e' gia' stata applicata al database di produzione (4 righe,
-- tutte presidenti, convertite con i 22 permessi completi). Resta qui come traccia e per
-- ricostruire l'ambiente da zero. E' idempotente.

update association_memberships
set
  role = 'association_admin',
  permissions = (
    select jsonb_object_agg(perm, true)
    from unnest(array[
      'manage_association_profile',
      'manage_public_page',
      'manage_application_cycles',
      'manage_application_questions',
      'publish_application_cycle',
      'close_application_cycle',
      'view_candidates',
      'view_candidate_answers',
      'view_candidate_academic_profile',
      'view_raw_transcript',
      'view_candidate_ai_evaluation',
      'add_internal_candidate_notes',
      'change_candidate_status',
      'send_interview_invites',
      'manage_interview_slots',
      'view_board_members',
      'invite_board_members',
      'manage_board_permissions',
      'upload_association_projects',
      'view_association_analytics',
      'export_candidate_data',
      'contact_candidates'
    ]) as perm
  )
where role = 'association_president';

-- Reviewer e interviewer non sono mai stati assegnati in produzione, ma se esistessero
-- in un altro ambiente diventano membri semplici: erano ruoli di sola lettura sulle
-- candidature, e quel livello intermedio non esiste piu'.
update association_memberships
set role = 'association_member', permissions = '{}'::jsonb
where role in ('association_reviewer', 'association_interviewer');
