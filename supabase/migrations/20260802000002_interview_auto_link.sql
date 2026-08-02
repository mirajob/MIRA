-- Migration: link della videochiamata generato da MIRA.
--
-- Finora l'associazione doveva procurarsi il link da sola: una stanza fissa per
-- tutti, oppure una diversa per ogni colloquio incollata a mano dopo la
-- prenotazione. Entrambe costano lavoro, e la seconda costringe a mandare due
-- email al candidato: prima la conferma, poi i dettagli.
--
-- Con 'auto' il link nasce insieme alla prenotazione e finisce nella stessa
-- email dell'orario, per il candidato e per chi conduce. È quello che fa
-- Calendly, ma senza collegare nessun account: un link Meet lo può generare solo
-- Google tramite le sue API, mentre su Jitsi la stanza è semplicemente un URL,
-- quindi basta comporlo. Nessuna API, nessun account, nessun costo.
--
-- La stanza è protetta dall'unica cosa che la protegge davvero in questo
-- modello: un nome lungo e casuale, impossibile da indovinare.

alter type interview_link_mode add value if not exists 'auto';

comment on column interview_sessions.link_mode is
  'auto = MIRA genera un link diverso per ogni colloquio al momento della prenotazione. shared = un solo posto per tutti (link o aula sulla sessione). per_interview = il posto lo mette chi conduce dopo la prenotazione.';

-- Il vincolo pretendeva un link sulla sessione per ogni round online che non
-- fosse per_interview. Con 'auto' quel link non esiste: nasce a ogni
-- prenotazione, quindi la sessione ne resta senza ed e' corretto cosi'.
alter table interview_sessions drop constraint if exists interview_sessions_place_present;

alter table interview_sessions
  add constraint interview_sessions_place_present check (
    status = 'draft'
    or link_mode in ('per_interview', 'auto')
    or (mode = 'in_person' and location is not null and length(trim(location)) > 0)
    or (mode = 'online' and meeting_link is not null and length(trim(meeting_link)) > 0)
  );
