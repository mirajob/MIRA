import type { Metadata } from "next";
import { LegalPageLayout, LegalSection } from "@/components/legal-page-layout";

export const metadata: Metadata = {
  title: "Informativa sulla Privacy — MIRA",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Informativa sulla Privacy" updated="Ultimo aggiornamento: 15 luglio 2026">
      <p className="text-body text-ink-secondary">
        Questa informativa descrive come MIRA raccoglie, utilizza e protegge i dati personali degli utenti della
        piattaforma, ai sensi del Regolamento (UE) 2016/679 (&quot;GDPR&quot;). È scritta per essere letta: se
        qualcosa non è chiaro, scrivici.
      </p>

      <LegalSection heading="1. Titolare del trattamento">
        <p>
          Il titolare del trattamento è il team di MIRA. Per l&apos;identificazione completa del titolare
          (denominazione e recapiti) puoi scrivere in qualsiasi momento a privacy@mirajob.cloud, e ti risponderemo
          con questi dati entro pochi giorni. Per qualsiasi richiesta relativa al trattamento dei tuoi dati,
          l&apos;indirizzo di riferimento è privacy@mirajob.cloud.
        </p>
      </LegalSection>

      <LegalSection heading="2. Quali dati trattiamo">
        <p>
          <strong className="text-ink">Dati di account:</strong> nome e cognome, email istituzionale, università,
          livello di studi, password (conservata in forma cifrata).
        </p>
        <p>
          <strong className="text-ink">Dati della MIRA Card:</strong> dati accademici estratti dal libretto che
          carichi (esami, voti, media, crediti); informazioni estratte dal CV, se scegli di caricarlo; esperienze,
          competenze, lingue, interessi, preferenze di lavoro, autodescrizione, piano di carriera e disponibilità
          che condividi durante la conversazione di onboarding o inserisci in seguito.
        </p>
        <p>
          <strong className="text-ink">Dati di utilizzo del servizio:</strong> candidature inviate alle
          associazioni e relative risposte; messaggi scambiati con associazioni e aziende sulla piattaforma; dati
          tecnici (log di accesso, cookie tecnici essenziali).
        </p>
        <p>
          Il conferimento dei dati della card è volontario: decidi tu cosa raccontare a MIRA e cosa approvare.
          Alcuni dati minimi (account, dati di base del percorso di studi) sono necessari per usare il servizio.
        </p>
      </LegalSection>

      <LegalSection heading="3. Chi vede i tuoi dati: come funziona la visibilità">
        <p>La visibilità dei tuoi dati su MIRA segue tre regole, valide sempre:</p>
        <p>
          <strong className="text-ink">Nulla è visibile senza la tua approvazione.</strong> Ogni sezione della tua
          card viene proposta in bozza e diventa visibile ad associazioni e aziende solo dopo che l&apos;hai
          approvata esplicitamente. Puoi modificare o rimuovere ogni contenuto in qualsiasi momento.
        </p>
        <p>
          <strong className="text-ink">Le associazioni</strong> vedono la tua card (nelle sole parti approvate, con
          le impostazioni di visibilità che hai scelto, ad esempio sulla media) soltanto se ti candidi a una loro
          selezione.
        </p>
        <p>
          <strong className="text-ink">Le aziende</strong> vedono la tua card in forma anonima: senza nome, senza
          foto e senza riferimenti che possano identificarti direttamente. La tua identità viene rivelata a
          un&apos;azienda solo se accetti la sua richiesta di contatto e scegli tu di rivelarla. L&apos;anonimato è
          una tua scelta, non un vincolo tecnico.
        </p>
        <p>Non vendiamo i tuoi dati e non li condividiamo con terze parti per finalità di marketing.</p>
      </LegalSection>

      <LegalSection heading="4. Finalità e basi giuridiche">
        <p>
          Trattiamo i tuoi dati per: <strong className="text-ink">creare e gestire il tuo account e la tua MIRA
          Card</strong>, incluse le funzioni di redazione assistita dei contenuti (base giuridica: esecuzione del
          contratto, art. 6.1.b GDPR); <strong className="text-ink">gestire le tue candidature alle associazioni</strong> e
          renderle valutabili dai reviewer (esecuzione del contratto, attivata da una tua azione esplicita);{" "}
          <strong className="text-ink">
            rendere la tua card ricercabile dalle aziende in forma anonima e gestire le richieste di contatto
          </strong>{" "}
          (esecuzione del contratto; la rivelazione dell&apos;identità avviene solo con una tua azione esplicita);{" "}
          <strong className="text-ink">inviarti comunicazioni di servizio essenziali</strong> (legittimo interesse);{" "}
          <strong className="text-ink">garantire la sicurezza e il funzionamento tecnico della piattaforma</strong>{" "}
          (legittimo interesse). Eventuali comunicazioni promozionali future avverranno solo con il tuo consenso,
          revocabile in ogni momento.
        </p>
      </LegalSection>

      <LegalSection heading="5. Strumenti di intelligenza artificiale">
        <p>
          MIRA utilizza modelli di intelligenza artificiale per: estrarre i dati accademici dal libretto e le
          informazioni dal CV; redigere le bozze dei contenuti della tua card, che restano sempre soggette alla tua
          approvazione; confrontare le ricerche delle aziende con i profili e suggerire i candidati coerenti, con
          una spiegazione.
        </p>
        <p>
          Tre garanzie su questo trattamento: <strong className="text-ink">(a)</strong> i fornitori dei modelli AI
          (attualmente OpenAI e Anthropic) trattano i dati come responsabili del trattamento ai sensi dell&apos;art.
          28 GDPR e, in base ai rispettivi termini per l&apos;uso via API, non utilizzano i dati per addestrare i
          propri modelli; <strong className="text-ink">(b)</strong> nessuna decisione che produce effetti giuridici
          o significativi su di te è basata unicamente su un trattamento automatizzato: l&apos;AI suggerisce e
          spiega, ma le decisioni di selezione e contatto sono sempre prese da persone (delle associazioni o delle
          aziende), e le tue candidature non vengono mai accettate o respinte automaticamente;{" "}
          <strong className="text-ink">(c)</strong> MIRA non genera né mostra a terzi valutazioni psicologiche o
          profili di personalità: i contenuti attitudinali presenti nella card sono esclusivamente quelli da te
          dichiarati e approvati.
        </p>
      </LegalSection>

      <LegalSection heading="6. Destinatari e responsabili del trattamento">
        <p>
          I dati sono conservati e trattati tramite fornitori che agiscono come responsabili del trattamento sulla
          base di accordi ai sensi dell&apos;art. 28 GDPR: Supabase (database, autenticazione, storage), Vercel
          (hosting), Resend (email transazionali), OpenAI e Anthropic (elaborazione AI). L&apos;elenco aggiornato
          dei responsabili è disponibile su richiesta.
        </p>
      </LegalSection>

      <LegalSection heading="7. Trasferimenti extra-UE">
        <p>
          Alcuni fornitori possono trattare dati su server situati fuori dallo Spazio Economico Europeo (in
          particolare negli Stati Uniti). In questi casi i trasferimenti si basano su decisioni di adeguatezza
          della Commissione Europea (incluso l&apos;EU-U.S. Data Privacy Framework, ove applicabile) o su Clausole
          Contrattuali Standard.
        </p>
      </LegalSection>

      <LegalSection heading="8. Conservazione">
        <p>
          I dati sono conservati finché il tuo account è attivo. Puoi eliminare il tuo account in qualsiasi
          momento: i dati personali vengono cancellati entro 30 giorni, salvo gli obblighi di conservazione
          previsti dalla legge e i dati resi anonimi in forma aggregata (non riconducibili a te). Se elimini un
          contenuto dalla card, smette immediatamente di essere visibile a terzi.
        </p>
      </LegalSection>

      <LegalSection heading="9. I tuoi diritti">
        <p>
          Hai il diritto di accedere ai tuoi dati, rettificarli, cancellarli, limitarne il trattamento, riceverli
          in formato portabile e opporti al trattamento (artt. 15–22 GDPR), oltre al diritto di proporre reclamo al
          Garante per la Protezione dei Dati Personali (www.garanteprivacy.it). Gran parte di questi diritti è
          esercitabile direttamente dalla piattaforma: la tua card è visibile e modificabile per intero dalla
          pagina Profilo, e ciò che vedi è esattamente ciò che vedono associazioni e aziende. Per tutto il resto:
          privacy@mirajob.cloud.
        </p>
      </LegalSection>

      <LegalSection heading="10. Età minima">
        <p>Il servizio è riservato a studenti universitari maggiorenni. Se hai meno di 18 anni, non registrarti.</p>
      </LegalSection>

      <LegalSection heading="11. Modifiche a questa informativa">
        <p>
          Questa informativa può essere aggiornata nel tempo. In caso di modifiche sostanziali ti avviseremo
          tramite la piattaforma o via email, indicando la data dell&apos;ultimo aggiornamento in cima alla pagina.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
