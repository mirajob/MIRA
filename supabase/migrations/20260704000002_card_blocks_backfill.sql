-- Migration: card_blocks backfill
-- One-time best-effort migration of existing student_profiles jsonb data into
-- card_blocks rows. Never inserts status = 'approved' — existing students confirm
-- each block on next login (spec docs/MIRA_SPEC_rifacimento_card_onboarding.md, section 10, item 1).
--
-- Key names read from student_profiles.availability are the ones actually written by
-- apps/web/src/lib/actions/chat-onboarding.ts and chat-profile.ts:
--   availability.status / .type / .period / .city   -> disponibilita
--   availability.career_targets.roles / .sectors     -> piano_carriera
--   availability.career_plan.short_term              -> piano_carriera
--   availability.personal_interests                  -> interessi

do $$
declare
  sp record;
  languages_arr jsonb;
  interests_combined jsonb;
  career_roles jsonb;
  career_sectors jsonb;
  career_plan_text text;
  piano_testo text;
  piano_stato text;
begin
  for sp in select * from student_profiles loop

    -- header
    insert into card_blocks (student_profile_id, block_type, prose_content, status, visibility)
    values (
      sp.id,
      'header',
      jsonb_build_object(
        'corso', sp.degree_program,
        'livello', sp.degree_level,
        'anno', sp.current_year,
        'laurea_anno', sp.graduation_year,
        'media_voti', (sp.transcript_summary->>'weighted_average')::numeric
      ),
      (case when sp.degree_program is not null then 'draft' else 'empty' end)::card_block_status,
      jsonb_build_object(
        'media_voti', jsonb_build_object(
          'associazioni', coalesce((sp.privacy_settings->>'show_grades_to_associations')::boolean, false),
          'aziende', coalesce((sp.privacy_settings->>'show_grades_to_companies')::boolean, false)
        )
      )
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- disponibilita
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'disponibilita',
      jsonb_build_object(
        'cosa_cerca', coalesce(sp.availability->>'type', sp.availability->>'status'),
        'da_quando', sp.availability->>'period',
        'dove', sp.availability->>'city',
        'vincoli', null
      ),
      (case
        when coalesce(sp.availability->>'type', sp.availability->>'status', sp.availability->>'period', sp.availability->>'city') is not null
        then 'draft' else 'empty'
      end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- esperienze: experiences jsonb array of narrative strings -> one item per string
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'esperienze',
      jsonb_build_object(
        'items', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid(),
              'titolo', '',
              'ruolo', '',
              'organizzazione', '',
              'periodo', '',
              'descrizione', value,
              'verified', false,
              'origin', 'manual'
            )
          ), '[]'::jsonb)
          from jsonb_array_elements_text(coalesce(sp.experiences, '[]'::jsonb)) as value
        )
      ),
      (case when jsonb_array_length(coalesce(sp.experiences, '[]'::jsonb)) > 0 then 'draft' else 'empty' end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- formazione: from normalized student_courses (verified, from transcript)
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'formazione',
      jsonb_build_object(
        'items', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', sc.id,
              'esame', sc.course_name,
              'voto', sc.grade,
              'cfu', sc.credits,
              'anno', sc.academic_year,
              'semestre', sc.semester,
              'verified', true,
              'origin', 'transcript'
            )
          ), '[]'::jsonb)
          from student_courses sc
          where sc.student_profile_id = sp.id
        )
      ),
      (case when exists (select 1 from student_courses sc where sc.student_profile_id = sp.id) then 'draft' else 'empty' end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- competenze: current data has no evidence-linked competencies (spec 3.3.5 requires
    -- every competency to reference an exam/experience) — nothing honest to migrate.
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (sp.id, 'competenze', '{"items": []}'::jsonb, 'empty'::card_block_status)
    on conflict (student_profile_id, block_type) do nothing;

    -- lingue: from cv_summary.languages
    languages_arr := coalesce(sp.cv_summary->'languages', '[]'::jsonb);
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'lingue',
      jsonb_build_object(
        'items', (
          select coalesce(jsonb_agg(
            jsonb_build_object(
              'id', gen_random_uuid(),
              'lingua', l->>'language',
              'livello', l->>'level',
              'certificazione', null,
              'verified', false,
              'origin', 'cv_upload'
            )
          ), '[]'::jsonb)
          from jsonb_array_elements(languages_arr) as l
        )
      ),
      (case when jsonb_array_length(languages_arr) > 0 then 'draft' else 'empty' end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- autodescrizione: profile_summary is AI-written in third person, not the student's
    -- own first-person voice required by spec 3.3.7 — migrating it would be dishonest.
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (sp.id, 'autodescrizione', '{"testo": null}'::jsonb, 'empty'::card_block_status)
    on conflict (student_profile_id, block_type) do nothing;

    -- interessi: interests[] + availability.personal_interests[] -> placeholder prose
    interests_combined := coalesce(sp.interests, '[]'::jsonb) || coalesce(sp.availability->'personal_interests', '[]'::jsonb);
    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'interessi',
      jsonb_build_object(
        'testo', (
          select nullif(string_agg(value, '. '), '')
          from jsonb_array_elements_text(interests_combined) as value
        )
      ),
      (case when jsonb_array_length(interests_combined) > 0 then 'draft' else 'empty' end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

    -- piano_carriera: goals[] + availability.career_targets/.career_plan.
    -- Ambiguous signals default to 'ipotesi' (some direction sensed, not confirmed);
    -- no signal at all defaults honestly to 'esplorazione' rather than forcing a goal.
    career_roles := coalesce(sp.availability->'career_targets'->'roles', '[]'::jsonb);
    career_sectors := coalesce(sp.availability->'career_targets'->'sectors', '[]'::jsonb);
    career_plan_text := sp.availability->'career_plan'->>'short_term';

    select nullif(string_agg(value, '. '), '') into piano_testo
    from jsonb_array_elements_text(
      coalesce(sp.goals, '[]'::jsonb) || career_roles || career_sectors
      || case when career_plan_text is not null then jsonb_build_array(career_plan_text) else '[]'::jsonb end
    ) as value;

    piano_stato := case
      when jsonb_array_length(career_roles) > 0 or jsonb_array_length(career_sectors) > 0 or career_plan_text is not null
        then 'ipotesi'
      else 'esplorazione'
    end;

    insert into card_blocks (student_profile_id, block_type, prose_content, status)
    values (
      sp.id,
      'piano_carriera',
      jsonb_build_object('stato', piano_stato, 'testo', piano_testo),
      (case when piano_testo is not null then 'draft' else 'empty' end)::card_block_status
    )
    on conflict (student_profile_id, block_type) do nothing;

  end loop;
end $$;
