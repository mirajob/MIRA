-- Le associazioni beta nascono nel percorso guidato: onboarding_state = {step:0, completed:false}
-- fa partire l'onboarding dalla prima tappa. E nascono con la gestione membri accesa
-- (membership_enabled = true): chi entra dal link e' un membro, e i membri promossi ad admin
-- ottengono l'accesso alla dashboard. Non c'e' piu' un toggle da attivare.
--
-- Le associazioni gia' esistenti restano con onboarding_state = {} e NON vengono buttate in
-- un onboarding: hanno gia' i loro contenuti (vedi readOnboardingState).

create or replace function set_beta_dashboard_on_association()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by_user_id is not null and not coalesce(new.beta_dashboard, false) then
    new.beta_dashboard := exists (
      select 1 from profiles
      where id = new.created_by_user_id and beta_owner
    );
  end if;

  if new.beta_dashboard then
    if new.onboarding_state is null or new.onboarding_state = '{}'::jsonb then
      new.onboarding_state := jsonb_build_object('step', 0, 'completed', false);
    end if;
    new.membership_enabled := true;
  end if;

  return new;
end;
$$;
