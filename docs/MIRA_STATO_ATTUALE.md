# MIRA — Stato attuale della piattaforma (luglio 2026)

## Cos'è MIRA (visione originale)

MIRA è una university talent platform per studenti Bocconi. L'idea centrale: costruire profili profondi degli studenti attraverso conversazioni AI — non CV statici, ma dati reali su esperienze, interessi, attitudini, competenze, disponibilità. Le aziende possono poi cercare candidati descrivendo in linguaggio naturale cosa cercano, e MIRA mostra i profili più coerenti con spiegazione del perché.

Il modello di raccolta dati: lo studente si registra → fa onboarding conversazionale con MIRA (chat AI) → MIRA costruisce il profilo → lo studente carica il libretto universitario (transcript) → MIRA lo analizza → lo studente può caricare il CV per contesto aggiuntivo.

---

## Cosa è stato costruito

### Stack tecnico
- **Web:** Next.js 15 (App Router, TypeScript, Tailwind CSS v4, shadcn/ui)
- **Backend:** Supabase (Postgres, Auth, Storage, Realtime, RLS)
- **AI:** Vercel AI SDK + OpenAI/Anthropic
- **Deploy:** Vercel + GitHub
- **Dominio:** mirajob.cloud

### Modulo studenti (completo)
- Registrazione con email @studbocconi.it
- Onboarding conversazionale con MIRA AI (chat multiturno)
- Upload libretto universitario (PDF) → analisi AI con estrazione voti, media, materie
- Upload CV (PDF) → analisi AI per contesto
- Profilo studente con summary generato da AI
- Candidature alle associazioni
- Pagina "Percorso" (pathway analysis)
- Notifiche

### Modulo associazioni (completo)
- Admin panel per gestire le associazioni Bocconi
- Le associazioni invitano presidenti con codice
- Gli studenti si candidano alle associazioni
- I reviewer dell'associazione valutano le candidature
- Interviste, selezioni, notifiche

### Modulo aziende (appena costruito, live)
- **Landing page** `/aziende` — pitch alle aziende + form registrazione
- **Registrazione azienda** → stato "pending" → admin MIRA approva
- **Dashboard azienda** `/company/[slug]/search` — ricerca candidati con AI
  - Sidebar con thread di ricerca multipli
  - Chat con AI: l'azienda descrive cosa cerca, l'AI risponde mostrando candidati anonimi (Candidato A, B...) presi dal database degli studenti onboardati
  - I candidati rilevanti hanno un pulsante "Contatta"
- **Contatti** `/company/[slug]/contacts` — lista richieste inviate, chat real-time con studente (Supabase Realtime), invito a colloquio
- **Lato studente** `/student/aziende` — richieste ricevute da aziende, accetta/rifiuta, chat, rivela identità, risponde agli inviti a colloquio
- **Admin** `/admin/companies` — approva/rifiuta aziende

### Admin panel (completo)
- Dashboard, Inviti, Associazioni, Utenti, Knowledge Base, Aziende

---

## Dati e flusso AI

### Onboarding studente
MIRA fa una conversazione guidata in italiano che raccoglie:
- Corso di laurea, anno, indirizzo
- Esperienze universitarie (associazioni, progetti, lavori)
- Esperienze pre-universitarie (sport, liceo, competizioni, volontariato)
- Interessi e motivazioni
- Obiettivi lavorativi e disponibilità

Il transcript del libretto viene analizzato per estrarre: media ponderata, esame con voto più alto/basso, materie, distribuzione voti, piano di studi.

Il CV (se caricato) viene usato come contesto aggiuntivo dall'AI.

### Ricerca aziendale
Quando un'azienda scrive "cerco un data analyst con Python e interesse finanza disponibile da settembre", l'AI:
1. Carica tutti gli studenti onboardati con i loro profili
2. Li rende anonimi (Candidato A, B, C...)
3. Risponde mostrando chi corrisponde e perché
4. Embeds un tag `[ID:uuid]` nascosto per il candidato rilevante
5. Il frontend mostra un bottone "Contatta" estratto dal tag

L'identità dello studente è protetta: è anonimo finché non accetta la richiesta e sceglie di rivelare i propri contatti.

---

## Feedback ricevuto (luglio 2026)

**Da Minerva (associazione Bocconi forte):**
- Hanno già un loro sistema interno per gestire le candidature alle associazioni — simile a quello di MIRA, secondo loro fatto meglio
- Il CV one-page è considerato un buon formato — le informazioni giuste ci sono
- Le aziende grandi (es. Bending Spoon) hanno già sistemi di screening efficaci e ricevono molte candidature
- L'orientamento è già ben servito da altri strumenti
- **Aspetto positivo:** aiutare gli studenti a costruire il proprio CV raccogliendo informazioni che magari non pensavano di includere (es. "ho vinto i campionati di matematica al liceo") — questo è visto come utile

---

## Domande strategiche aperte

1. **Il core value:** è il CV-building (aiutare lo studente a costruire un profilo ricco) o è la ricerca per le aziende (trovare candidati in modo nuovo)?
2. **Il modulo associazioni** è la trojan horse per raccogliere dati studenti, o è un prodotto a sé che compete con sistemi già esistenti?
3. **L'orientamento** va lasciato da parte per ora?
4. **Target aziende:** startup e PMI che non hanno sistemi di screening sofisticati? o grandi aziende che vogliono accesso a dati più profondi dei CV?
5. **Differenziazione da LinkedIn/JobGate:** LinkedIn ha i dati ma non ha la profondità conversazionale. MIRA può avere profili che includono cose che uno studente non metterebbe su LinkedIn (campionati di matematica al liceo, interessi reali, disponibilità concreta).
