import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Termini di Servizio — MIRA",
};

export default function TerminiPage() {
  return (
    <LegalPageLayout title="Termini di Servizio" updated="Ultimo aggiornamento: 15 luglio 2026">
      <p className="text-body text-ink-secondary">
        Questi termini regolano l&apos;uso di MIRA (mirajob.cloud). Creando un account li accetti.
      </p>

      <LegalSection heading="1. Cos'è MIRA">
        <p>
          MIRA è una piattaforma che permette agli studenti universitari di costruire un profilo professionale (la
          &quot;MIRA Card&quot;), candidarsi alle selezioni delle associazioni universitarie presenti sulla
          piattaforma ed essere trovati e contattati dalle aziende registrate. Per l&apos;identificazione completa
          del soggetto che fornisce il servizio, scrivi a privacy@mirajob.cloud (&quot;noi&quot;).
        </p>
      </LegalSection>

      <LegalSection heading="2. Account">
        <p>
          Per registrarti come studente devi: essere uno studente universitario maggiorenne; usare la tua email
          istituzionale; fornire informazioni veritiere. L&apos;account è personale e non cedibile. Sei responsabile
          della custodia delle tue credenziali.
        </p>
      </LegalSection>

      <LegalSection heading="3. La tua MIRA Card e i tuoi contenuti">
        <p>
          I contenuti della tua card restano tuoi. Caricandoli o approvandoli ci concedi una licenza limitata a
          conservarli, elaborarli (anche tramite strumenti di intelligenza artificiale, come descritto
          nell&apos;Informativa Privacy) e mostrarli esclusivamente ai soggetti che autorizzi attraverso le tue
          azioni sulla piattaforma: le associazioni a cui ti candidi e, in forma anonima, le aziende registrate. La
          licenza cessa per i contenuti che elimini e alla chiusura dell&apos;account.
        </p>
        <p>
          Sei responsabile della veridicità di quanto dichiari. I dati estratti dal libretto universitario sono
          contrassegnati come verificati: manometterli o caricare documenti falsi comporta la chiusura
          dell&apos;account.
        </p>
      </LegalSection>

      <LegalSection heading="4. Regole d'uso">
        <p>
          Non è consentito: fornire informazioni false o fingersi un&apos;altra persona; usare la piattaforma per
          finalità diverse da quelle previste (per gli studenti: candidature e opportunità professionali; per
          associazioni e aziende: selezione e ricerca di candidati); estrarre dati in modo automatizzato, rivendere
          o condividere l&apos;accesso; usare i contatti ottenuti tramite MIRA per scopi diversi dalla selezione
          (es. marketing); tenere comportamenti molesti o discriminatori nelle chat.
        </p>
      </LegalSection>

      <LegalSection heading="5. Costi">
        <p>
          MIRA è gratuita per gli studenti. Per le aziende, le condizioni economiche sono definite in accordi
          separati (incluse le condizioni del programma pilota). Per le associazioni il servizio di gestione
          candidature è gratuito.
        </p>
      </LegalSection>

      <LegalSection heading="6. Ruolo di MIRA">
        <p>
          MIRA mette in contatto studenti, associazioni e aziende, ma non è parte dei rapporti che ne nascono: non
          siamo un&apos;agenzia per il lavoro, non garantiamo candidature accolte, colloqui, stage o assunzioni, e
          non rispondiamo delle decisioni prese da associazioni e aziende. I suggerimenti generati
          dall&apos;intelligenza artificiale sono strumenti di supporto e possono contenere imprecisioni: verifica
          sempre le informazioni rilevanti.
        </p>
      </LegalSection>

      <LegalSection heading="7. Disponibilità del servizio e limitazione di responsabilità">
        <p>
          Il servizio è fornito &quot;così com&apos;è&quot;, nella fase attuale di sviluppo. Facciamo il possibile
          per garantirne continuità e sicurezza, ma non garantiamo assenza di interruzioni o errori. Nei limiti
          consentiti dalla legge, la nostra responsabilità è limitata ai danni diretti causati da dolo o colpa
          grave. Nulla in questi termini limita i diritti che ti spettano per legge come consumatore.
        </p>
      </LegalSection>

      <LegalSection heading="8. Sospensione e chiusura">
        <p>
          Possiamo sospendere o chiudere gli account che violano questi termini, con preavviso salvo i casi gravi.
          Puoi chiudere il tuo account in qualsiasi momento dalla piattaforma; la gestione dei dati dopo la
          chiusura è descritta nell&apos;Informativa Privacy.
        </p>
      </LegalSection>

      <LegalSection heading="9. Modifiche">
        <p>
          Possiamo aggiornare questi termini. In caso di modifiche sostanziali ti avviseremo tramite la piattaforma
          o via email; continuando a usare il servizio dopo l&apos;avviso, accetti i termini aggiornati.
        </p>
      </LegalSection>

      <LegalSection heading="10. Legge applicabile e foro">
        <p>
          Questi termini sono regolati dalla legge italiana. Per le controversie con utenti consumatori è
          competente il foro del luogo di residenza del consumatore; negli altri casi, il foro di Milano.
        </p>
      </LegalSection>

      <LegalSection heading="11. Contatti">
        <p>Per qualsiasi domanda su questi termini: privacy@mirajob.cloud.</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
