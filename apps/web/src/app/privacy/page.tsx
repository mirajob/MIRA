import type { Metadata } from "next";
import Link from "next/link";
import { getLocale } from "next-intl/server";
import { LocaleSwitcher } from "@/components/locale-switcher";

export const metadata: Metadata = {
  title: "Privacy Policy — MIRA",
};

/**
 * Informativa privacy (art. 13-14 GDPR) — bozza standard, NON revisionata da un legale.
 * I placeholder tra [ ] (ragione sociale, P.IVA, sede, contatto DPO) vanno completati e
 * il testo va fatto validare da un consulente privacy/legale prima del lancio pubblico.
 */

const CONTENT = {
  it: {
    title: "Informativa sulla Privacy",
    updated: "Ultimo aggiornamento: 15 luglio 2026",
    intro:
      "La presente informativa descrive come MIRA raccoglie, utilizza e protegge i dati personali degli utenti della piattaforma (studenti, associazioni, aziende), ai sensi del Regolamento (UE) 2016/679 (\"GDPR\").",
    draftNotice:
      "Bozza in attesa di revisione legale — ragione sociale, sede, P.IVA e contatto del titolare/DPO sono placeholder da completare prima del lancio pubblico.",
    sections: [
      {
        heading: "1. Titolare del trattamento",
        body: "Il titolare del trattamento è [Ragione sociale], con sede in [Indirizzo], P.IVA [P.IVA]. Per qualsiasi richiesta relativa al trattamento dei tuoi dati puoi scrivere a [privacy@mirajob.cloud].",
      },
      {
        heading: "2. Dati raccolti",
        body: "Raccogliamo: dati anagrafici e di contatto (nome, email istituzionale, università, corso di studi); dati accademici (esami, media voti, transcript caricato); contenuti del profilo (esperienze, competenze, lingue, disponibilità, descrizioni testuali); dati relativi alle candidature inviate alle associazioni/aziende; dati tecnici di utilizzo della piattaforma (log, cookie tecnici).",
      },
      {
        heading: "3. Finalità e base giuridica",
        body: "I dati sono trattati per: creare e gestire il tuo profilo MIRA (esecuzione del contratto/misure precontrattuali); permettere il matching e la valutazione delle candidature da parte di associazioni e aziende partner (esecuzione del contratto, consenso esplicito per le candidature); inviarti comunicazioni di servizio essenziali (legittimo interesse); migliorare la piattaforma tramite strumenti di intelligenza artificiale che assistono — ma non sostituiscono — le decisioni umane di selezione (consenso).",
      },
      {
        heading: "4. Modalità del trattamento e fornitori",
        body: "I dati sono conservati su infrastrutture cloud fornite da Supabase (database, autenticazione, storage) e Vercel (hosting), e trattati per l'invio di email transazionali da Resend. Questi fornitori agiscono come responsabili del trattamento ai sensi dell'art. 28 GDPR, con adeguati accordi contrattuali (Data Processing Agreement) in essere.",
      },
      {
        heading: "5. Destinatari dei dati",
        body: "I dati del tuo profilo sono visibili, secondo le impostazioni di visibilità che scegli, alle associazioni universitarie e alle aziende partner con cui interagisci sulla piattaforma (candidature, ricerca profili). Non vendiamo né cediamo i tuoi dati a terzi per finalità di marketing.",
      },
      {
        heading: "6. Trasferimento dei dati extra-UE",
        body: "Alcuni fornitori tecnici possono trattare dati su server situati fuori dallo Spazio Economico Europeo. In questi casi il trasferimento avviene sulla base di Clausole Contrattuali Standard approvate dalla Commissione Europea o di altre garanzie adeguate previste dal GDPR.",
      },
      {
        heading: "7. Periodo di conservazione",
        body: "I dati sono conservati per la durata dell'account e per il tempo necessario alle finalità sopra descritte. Puoi richiedere la cancellazione del tuo account e dei relativi dati in qualsiasi momento, salvi gli obblighi di legge che impongano una conservazione più lunga.",
      },
      {
        heading: "8. I tuoi diritti",
        body: "In qualità di interessato hai diritto di accesso, rettifica, cancellazione, limitazione del trattamento, portabilità dei dati e opposizione, oltre al diritto di proporre reclamo al Garante per la Protezione dei Dati Personali (www.garanteprivacy.it). Per esercitare questi diritti scrivi a [privacy@mirajob.cloud].",
      },
      {
        heading: "9. Modifiche a questa informativa",
        body: "Questa informativa può essere aggiornata nel tempo. In caso di modifiche sostanziali, ti informeremo tramite la piattaforma o via email.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "Last updated: July 15, 2026",
    intro:
      "This notice describes how MIRA collects, uses, and protects the personal data of platform users (students, associations, companies), in accordance with Regulation (EU) 2016/679 (\"GDPR\").",
    draftNotice:
      "Draft pending legal review — the legal entity name, address, VAT number, and controller/DPO contact are placeholders to be completed before public launch.",
    sections: [
      {
        heading: "1. Data controller",
        body: "The data controller is [Legal entity name], registered office at [Address], VAT number [VAT number]. For any request regarding the processing of your data, you can write to [privacy@mirajob.cloud].",
      },
      {
        heading: "2. Data we collect",
        body: "We collect: identification and contact data (name, institutional email, university, degree program); academic data (exams, grade average, uploaded transcript); profile content (experience, skills, languages, availability, written descriptions); data related to applications submitted to associations/companies; technical usage data (logs, essential cookies).",
      },
      {
        heading: "3. Purposes and legal basis",
        body: "Data is processed to: create and manage your MIRA profile (performance of a contract / pre-contractual measures); enable matching and evaluation of applications by partner associations and companies (performance of a contract, explicit consent for applications); send you essential service communications (legitimate interest); improve the platform through AI tools that assist — but never replace — human selection decisions (consent).",
      },
      {
        heading: "4. Processing methods and providers",
        body: "Data is stored on cloud infrastructure provided by Supabase (database, authentication, storage) and Vercel (hosting), and processed for transactional emails by Resend. These providers act as data processors under Article 28 GDPR, under appropriate Data Processing Agreements.",
      },
      {
        heading: "5. Data recipients",
        body: "Depending on the visibility settings you choose, your profile data is visible to the university associations and partner companies you interact with on the platform (applications, profile search). We do not sell or share your data with third parties for marketing purposes.",
      },
      {
        heading: "6. International data transfers",
        body: "Some technical providers may process data on servers located outside the European Economic Area. In these cases, transfers rely on Standard Contractual Clauses approved by the European Commission or other adequate safeguards under the GDPR.",
      },
      {
        heading: "7. Retention period",
        body: "Data is retained for the lifetime of your account and for as long as necessary for the purposes described above. You may request deletion of your account and related data at any time, subject to legal retention obligations.",
      },
      {
        heading: "8. Your rights",
        body: "As a data subject you have the right to access, rectify, erase, restrict processing, port your data, and object to processing, as well as the right to lodge a complaint with the Italian Data Protection Authority (www.garanteprivacy.it). To exercise these rights, write to [privacy@mirajob.cloud].",
      },
      {
        heading: "9. Changes to this notice",
        body: "This notice may be updated over time. In case of material changes, we will notify you through the platform or by email.",
      },
    ],
  },
} as const;

export default async function PrivacyPage() {
  const locale = await getLocale();
  const copy = locale === "en" ? CONTENT.en : CONTENT.it;

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-border px-4 py-4 lg:px-8">
        <Link href="/">
          <img src="/brand/mira-lockup.svg" alt="MIRA" className="h-6" />
        </Link>
        <LocaleSwitcher />
      </header>

      <main className="mx-auto max-w-2xl px-4 py-10 lg:py-14">
        <h1 className="font-display text-h1 text-navy">{copy.title}</h1>
        <p className="mt-2 text-body-sm text-ink-tertiary">{copy.updated}</p>

        <div className="mt-4 rounded-md border border-warning/40 bg-warning-bg px-4 py-3 text-body-sm text-ink-secondary">
          {copy.draftNotice}
        </div>

        <p className="mt-6 text-body text-ink-secondary">{copy.intro}</p>

        <div className="mt-8 space-y-7">
          {copy.sections.map((s) => (
            <section key={s.heading}>
              <h2 className="text-label text-navy">{s.heading}</h2>
              <p className="mt-1.5 text-body-sm text-ink-secondary leading-relaxed">{s.body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
