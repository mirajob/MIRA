# MIRA Card Rework — Nuova specifica 1.3 / 1.4 (con dubbi tecnici da investigare)

**Data:** 14 luglio 2026
**Stato:** specifica approvata dal founder — sostituisce le sezioni 1.3 e 1.4 di `docs/MIRA_STATO_PRODOTTO.md`
**Contenuto:** nuova struttura della MIRA Card (da 8 a 6 blocchi), nuovo flusso di onboarding, perfezionamenti alla chat. In coda: 40 dubbi tecnici da investigare prima dell'implementazione (sono dubbi, non conclusioni).

---

## 1.3 La MIRA Card — il cuore del prodotto

La MIRA Card è un "CV virtuale": una pagina in formato A4 fisso, uguale per chiunque la guardi (studente, associazione, azienda). È pensata come profilo iniziale per aziende e associazioni che normalmente ricevono solo un curriculum tradizionale: contiene le informazioni che starebbero in un CV, le rende più leggibili e comparabili, aggiunge disponibilità specifiche utili al matching e include una parte più personale su interessi, priorità e modo in cui lo studente vuole presentarsi.

La card è sempre scritta in inglese, anche se lo studente chatta in italiano: è MIRA a tradurre, sintetizzare e dare forma al contenuto.

È composta da **6 blocchi visibili**, ognuno dei quali passa per tre stati: vuoto → bozza (proposta da MIRA) → approvato (confermato dallo studente). Niente entra nella card senza che lo studente lo confermi.

| Blocco | Contenuto |
|---|---|
| **Header** | Università, corso, livello (triennale/magistrale/ciclo unico), anno, anno di immatricolazione, anno di laurea previsto, media se disponibile dal libretto. Se magistrale: anche la triennale precedente. La visibilità della media è controllabile dallo studente. |
| **Esperienze** | Esperienze lavorative, extracurricolari, associative, sportive, progettuali o personali, descritte in stile CV inglese ("Built…", "Led…", "Supported…"), estratte dal CV caricato e/o raccontate in chat. |
| **Disponibilità e piano** | Stato della disponibilità lavorativa: attiva o non attiva. Se attiva: cosa cerca lo studente (stage, part-time, progetto, internship, esperienza associativa/professionale), in che ambito, da quando, per quanto tempo, dove o con quali preferenze di sede. Se non è in cerca, il blocco mostra semplicemente la disponibilità non attiva, senza tag duplicati tipo "not looking / not looking". Nello stesso blocco viene indicata anche la direzione dei prossimi mesi/anni: exchange, magistrale, laurea, lavoro, certificazioni, progetti, oppure esplorazione. Se lo studente ha già un'idea di carriera, viene esplicitata; se sta ancora valutando, viene scritto in modo onesto. |
| **Competenze** | Due categorie: academic e hard. Le academic skill descrivono ciò che lo studente ha studiato e acquisito sul piano teorico/universitario, ad esempio aree come accounting, corporate finance, financial statement analysis, statistics, marketing, law, economics, data analysis. Se il libretto è stato caricato, MIRA propone competenze accademiche partendo da esami e voti, ma lo studente può modificarle, rimuoverle o aggiungerne altre in chat. Se il libretto non è stato caricato, è stato saltato, oppure non è ancora utile perché lo studente ha appena iniziato un percorso o non ha ancora esami rilevanti, MIRA chiede direttamente allo studente quali competenze teoriche ritiene di aver acquisito dagli esami, dal percorso precedente o dalle aree in cui è andato meglio. Le hard skill descrivono invece strumenti, software, metodologie e capacità pratiche che lo studente sa usare o ha applicato. **Le soft skill non compaiono più nel blocco Competenze della MIRA Card iniziale.** |
| **Lingue** | Lingue conosciute, certificazione e relativo livello. Se il CV contiene già lingue, MIRA le propone allo studente chiedendo conferma, livello ed eventuali aggiunte. Se il CV non è stato caricato o non contiene lingue, MIRA le chiede in chat. La stessa lingua può comparire una sola volta nella card: le lingue estratte dal CV e quelle dette in chat vengono normalizzate e unite, evitando duplicati. |
| **Profilo personale** | Sezione unica che unisce interessi e autodescrizione. Contiene una breve prosa in prima persona su cosa interessa davvero allo studente, cosa segue fuori dai programmi d'esame, cosa fa con costanza, come si descrive o come verrebbe descritto da chi lo conosce, quali priorità o abitudini vuole far emergere. Questa sezione può far capire alcuni tratti personali e modi di lavorare, ma non è una valutazione attitudinale profonda e non produce etichette psicologiche o soft skill "certificate". È il modo in cui lo studente sceglie di presentarsi oltre esperienze, esami e competenze. |

Il libretto e il CV si possono caricare e ricaricare anche in seguito dalla pagina Profilo. Quando vengono aggiornati, MIRA può proporre modifiche ai blocchi interessati, ma ogni modifica deve comunque essere approvata dallo studente.

---

## 1.4 Il percorso dello studente, dall'inizio alla fine

### Registrazione

Lo studente si registra con l'email universitaria, verifica l'email e viene portato all'onboarding. L'onboarding è obbligatorio almeno fino al completamento della Fase A prima di potersi candidare a un'associazione.

### L'onboarding: una chat con un pannello live

Lo schermo è diviso in due: a sinistra la chat con MIRA, a destra il pannello della card che si riempie in tempo reale man mano che lo studente risponde. Quando un blocco è pronto, lo studente lo conferma dal pannello, tramite il bottone sul blocco, **oppure in chat, dicendolo direttamente a MIRA** (questa è una nuova modifica: MIRA deve capire che uno dice "conferma", "va bene così, andiamo avanti col prossimo blocco", ecc.).

La chat è in italiano o inglese, seguendo la lingua dell'interfaccia oppure la lingua con cui lo studente scrive, visto che è una AI e dovrebbe capirlo. Il contenuto finale della card è sempre in inglese.

L'onboarding è diviso in due fasi:
- **Fase A:** obbligatoria, sblocca la candidatura alle associazioni.
- **Fase B:** facoltativa, completa la card con competenze, lingue e profilo personale.

---

### FASE A — obbligatoria (sblocca la candidatura alle associazioni)

**Passo 1 — Benvenuto.** MIRA si presenta:

> "Ciao {nome}! Io sono MIRA. Costruiamo insieme la tua MIRA Card: ti serve per candidarti alle associazioni, ed è il profilo con cui le aziende potranno trovarti e contattarti direttamente. La tua MIRA Card sarà scritta in inglese, ci penso io a tradurre."

**Passo 2 — Livello di studi.** Se il livello è già noto dalla registrazione:

> "Dalla registrazione risulta che stai facendo {livello}. Confermi?"

**Da togliere:** "Partiamo dalle basi: studi triennale, magistrale o ciclo unico?" (cosa che non dovrebbe neanche esserci, visto che è obbligatorio metterlo nella registrazione — probabilmente è vecchia questa frase).

**Passo 3 — Triennale precedente, solo per studenti magistrali.**

> "Perfetto. Prima di procedere, dove hai fatto la triennale, in che corso e con che voto di laurea? Puoi anche raccontarmi della tua tesi."

MIRA estrae anche il tema della tesi se citato.

**Passo 4 — Libretto.**

> "Carica il libretto/transcript in PDF: leggo corso, esami, voti e media direttamente da lì. Se non ce l'hai sotto mano, puoi saltare."

**Qui da fare modifica importante:** se sono studenti Bocconi (lo sappiamo già dalla registrazione), digli come scaricarlo (da you@b ecc.). Per le altre università digli una frase generica: lo dovresti trovare sul sito della tua università nei documenti, ecc. (questo perché per le altre uni non so dove si trovi — magari è una modifica che faremo in futuro).

Se il libretto viene caricato, MIRA lo legge e risponde:

> "Fatto: {N} esami, {N} CFU, media {X}/30."

Poi indica eventuali dati ancora mancanti.

Se il libretto viene saltato:

> "Va bene — dimmi almeno il nome del corso e l'anno che frequenti: potrai caricare il libretto quando vuoi dal tuo Profilo, aggiornando media ed esami."

Qui se uno risponde tipo "cleam", MIRA deve capire che è il nome di un corso, non continuare a ripetere la stessa frase a pappagallo: quindi magari gli chiede "il nome del corso è cleam? Sta per corso di laurea in… oppure per qualcos'altro?" e se lo studente risponde altro, lui deve capirlo, proprio come fa l'AI normalmente.

Se lo studente ha appena iniziato un percorso e il libretto non contiene ancora esami utili, MIRA usa comunque il libretto per i dati anagrafici/accademici disponibili, ma non forza la proposta automatica delle competenze accademiche.

**Passo 5 — Dati mancanti dell'Header.** MIRA chiede in modo mirato solo ciò che manca:

> "Mi dici {campi mancanti}?"

Continua finché l'Header non è completo: università, corso, livello, anno di corso, anno di immatricolazione, anno di laurea previsto, media se disponibile. Poi:

> "Perfetto, conferma il blocco Header qui a destra per continuare."

**Passo 6 — CV.** Dopo la conferma dell'Header:

> "Hai un CV? Caricalo e ti farò delle domande. Se non ce l'hai, nessun problema: lo costruiamo parlando."

**Passo 7 — Esperienze.** Il comportamento dipende dal CV.

Per ogni esperienza trovata nel CV, MIRA chiede:

> "Su {titolo} @ {organizzazione} — cosa hai fatto tu, concretamente?"

Se il CV descrive già bene l'esperienza, MIRA propone:

> "Il CV descrive già bene questa esperienza: {titolo} @ {organizzazione}. Va bene così com'è, o vuoi aggiungere o correggere qualcosa?"

In coda, oppure come unica domanda se non c'è CV, arriva la domanda sull'esperienza nascosta:

> "C'è qualcosa che non hai mai messo nel CV? Progetti personali, competizioni, sport a livello agonistico, volontariato, lavori, attività associative — qualsiasi cosa pensi possa rappresentarti."

Lo studente può interrompere in anticipo con messaggi come "basta con le esperienze" o "andiamo avanti" e MIRA chiude la fase. MIRA scrive le esperienze in card in stile CV inglese e chiede conferma del blocco.

**Passo 8 — Disponibilità e piano.**

> "Ultima cosa: definiamo disponibilità e prossimi passi.
> Sei alla ricerca di un lavoro o aperto a future opportunità?"

Se la risposta è positiva allora chiedi:

> "Che tipo di esperienza cerchi, in che ambito, da quando, per quanto tempo e dove."

E poi a tutti:

> "— Cosa hai in programma per i prossimi mesi/anni? (es. exchange, laurea, magistrale, lavoro, certificazioni, o altro)
> — Hai già in mente una direzione di carriera precisa o stai ancora esplorando?
> Scrivi come ti viene: poi organizzo tutto io."

MIRA sintetizza il blocco in due parti visive:
- disponibilità lavorativa, con toggle attivo/non attivo;
- piano e direzione, con una formulazione breve e onesta.

Se lo studente non è in cerca, MIRA non genera tag duplicati. Il blocco mostra solo la disponibilità non attiva e, se lo studente lo ha indicato, il motivo o il piano attuale. Alla fine MIRA chiede conferma del blocco Disponibilità e piano.

**Passo 9 — Il gate.** Alla conferma del blocco Disponibilità e piano, l'onboarding obbligatorio è completo:

> "Candidatura sbloccata. La tua card è al {X}%: puoi già candidarti alle associazioni su MIRA. Oppure completiamo le ultime sezioni in pochi minuti."
>
> "ATTENZIONE: Più completo è il profilo, più attrai l'attenzione delle aziende!"

**Quest'ultimo avviso va mostrato in un box giallo chiaro con scritta verde.**

Da qui lo studente può uscire e candidarsi, oppure proseguire con la Fase B.

---

### FASE B — facoltativa (completa la card)

**Passo 1 — Competenze accademiche.** Il comportamento dipende dal libretto.

Se il libretto è stato caricato e contiene esami utili, MIRA analizza esami e voti, li raggruppa per area tematica e propone alcune competenze accademiche. In chat dice:

> "Completiamo insieme le ultime sezioni. Dai tuoi esami ho già proposto alcune competenze accademiche nel blocco Competenze qui a destra — dacci un'occhiata." (oppure direttamente gliele mostra nel messaggio, tipo "ti propongo di mettere queste competenze")
> "Puoi confermarle, correggerle, toglierne qualcuna o aggiungerne altre. Se pensi che manchi qualcosa, dimmi pure quali competenze teoriche senti di aver acquisito dal tuo percorso o dagli esami in cui sei andato meglio."

Se il libretto non è stato caricato, è stato saltato, oppure non contiene ancora esami utili perché lo studente ha appena iniziato un nuovo percorso, MIRA **non salta** le competenze accademiche. Chiede invece:

> "Partiamo dalle skills accademiche: quali competenze teoriche senti di aver acquisito? Per esempio: financial statement analysis, accounting, corporate finance, statistics, economics, marketing, law, data analysis o altre aree simili.
> Puoi anche dirmi gli esami o le materie in cui sei andato meglio."

MIRA non pretende che ogni academic skill sia collegata automaticamente a un voto o a un esame caricato. Se il dato esiste, lo usa come supporto. Se non esiste, lavora su ciò che lo studente dichiara in chat, senza inventare contenuti non detti. Lo studente può modificare la bozza in chat finché il blocco Competenze non rappresenta correttamente ciò che vuole mostrare.

**Passo 2 — Hard skill.** Dopo la parte academic, MIRA chiede la parte hard:

> "Ora passiamo alle hard skill: strumenti, software, metodologie o capacità pratiche che sai usare o hai applicato. Qui non parliamo di teoria studiata, ma di cose che sai fare o usare concretamente.
> Dimmi liberamente cosa sai usare e, se vuoi, dove l'hai usato."

MIRA estrae le hard skill citate e, quando possibile, stima un livello prudente dal modo in cui lo studente ne parla. Se lo studente specifica contesto o livello, MIRA lo usa. Se non lo specifica, non forza collegamenti artificiali a esperienze o voti.

Il blocco Competenze contiene quindi solo:
- **academic skill:** cosa lo studente ha studiato e acquisito come teoria;
- **hard skill:** cosa lo studente sa applicare o usare.

**Le soft skill non vengono più chieste tramite quiz e non vengono più salvate nel blocco Competenze della MIRA Card iniziale.**

Quando academic e hard skill sono pronte, MIRA chiede conferma del blocco Competenze.

**Passo 3 — Lingue.** Il comportamento dipende dal CV e dai dati già presenti.

Se il CV contiene lingue, MIRA dice:

> "Nel CV ho trovato queste lingue: {lingue}. Vanno bene?"

Se il CV non è stato caricato o non contiene lingue, MIRA chiede:

> "Che lingue conosci e a che livello?"

MIRA deve evitare duplicati. Se una lingua è già stata trovata nel CV e lo studente la ripete in chat, viene aggiornata o confermata, non aggiunta una seconda volta. La normalizzazione vale anche per varianti come "inglese", "English", "fluent English" o "corso in inglese": nella card la lingua compare una sola volta, con il livello più chiaro disponibile.

Quando il blocco Lingue è pronto, MIRA chiede conferma.

**Passo 4 — Profilo personale.** Interessi e autodescrizione diventano un'unica sezione e una sola domanda principale. MIRA chiede:

> "Ora una parte che sul CV di solito manca: come ti presenti oltre a esami ed esperienze. Non serve un elenco di hobby né una frase fatta da colloquio. Racconta qualcosa di autentico: aiuterà chi legge a capire meglio chi sei veramente.
> Ecco alcune linee-guida per aiutarti a rispondere:
> — Cosa segui per conto tuo, fuori dai programmi d'esame? Newsletter, podcast, canali, temi su cui finisci spesso a leggere.
> — Fuori dallo studio: cosa fai con costanza? Sport, musica, progetti, volontariato — anche cose insolite, se ti rappresentano.
> — Come ti descriverebbero le persone che ti conoscono bene?
> — Cosa non sopporti nel lavoro o nello studio, oppure a cosa non rinunci?
> — Qual è la cosa più 'te' che hai fatto nell'ultimo anno?
> Scrivi come parli, io trasformo tutto in un testo in prima persona, poi tu approvi."

MIRA usa questa risposta per costruire un unico blocco Profilo personale, che unisce:
- interessi professionali e personali reali;
- attività o abitudini portate avanti con costanza;
- elementi di autodescrizione;
- priorità personali;
- elementi leggeri sul modo in cui lo studente vuole presentarsi.

Questa sezione può far emergere aspetti che prima venivano cercati indirettamente nelle soft skill, ma senza trasformarli in valutazione attitudinale, punteggi o etichette. MIRA non scrive "leadership", "resilienza", "teamwork" o simili come competenze certificate. Scrive invece una breve presentazione personale basata sulle parole dello studente.

**Da togliere:** se la risposta è troppo generica o troppo breve, MIRA NON fa una domanda di rilancio.

Quando il blocco Profilo personale è pronto, MIRA chiede conferma.

**Passo 5 — Chiusura.**

> "Hai completato la tua MIRA Card!
> La trovi nella sezione Profilo, e puoi modificarla quando vuoi."

---

### Comportamenti trasversali della chat

- **Risposte fuori tema:** se lo studente fa una domanda, esprime un dubbio, critica o scrive qualcosa di non pertinente, MIRA non ripete la domanda a pappagallo. Risponde a ciò che ha scritto in massimo 3 frasi e poi ripropone la domanda riformulata. Prima di chiudere un blocco, MIRA giudica sempre se la risposta è nel merito, per evitare che la card si riempia di dati vuoti o casuali.
- **Skip:** libretto e CV sono saltabili. Si possono caricare in seguito dal Profilo.
- **Ripresa:** se lo studente esce e rientra, MIRA riprende dal punto giusto con un solo messaggio di bentornato, senza riprodurre l'intera conversazione. La fase corrente viene sempre ricalcolata dallo stato reale dei blocchi, non da un contatore.
- **Lingua:** la chat segue la lingua dell'interfaccia, italiano o inglese. Il contenuto della card è sempre in inglese. MIRA non cita mai in chat il testo inglese della card per non mescolare le lingue.
- **Duplicati:** MIRA deve evitare duplicati nei blocchi in cui può ricevere la stessa informazione da più fonti, soprattutto Lingue e Disponibilità. Se una lingua, una disponibilità o un'informazione è già presente da CV, libretto o risposta precedente, MIRA chiede conferma o aggiornamento invece di inserirla una seconda volta.
- **Modifiche:** lo studente può correggere, aggiungere o togliere contenuti in chat prima della conferma del blocco. Dopo l'onboarding, può modificare la card dal Profilo.

### Dopo l'onboarding: candidature e profilo

- **Profilo:** lo studente vede e modifica la propria card usando gli stessi componenti dell'onboarding. Può ricaricare libretto e CV e aggiornare i blocchi interessati.
- **Associazioni:** lo studente vede l'elenco delle associazioni, la pagina vetrina di ciascuna e può candidarsi ai cicli aperti con le domande personalizzate dell'associazione.
- **Tracking:** lo studente ha una pagina "Le mie candidature" con stato della candidatura (inviata, in revisione, colloquio, accettata, rifiutata, lista d'attesa, ritirata) e inviti a colloquio.

---

# Dubbi tecnici da investigare lato implementazione

Questi sono solo dubbi da investigare dopo aver letto lo stato tecnico attuale di MIRA, non conclusioni.

1. Mi chiedo se il passaggio da 8 blocchi visibili a 6 blocchi possa creare problemi perché oggi `card_blocks` sembra avere ancora `block_type` separati per `disponibilita`, `interessi`, `autodescrizione`, `piano_carriera` e il completamento della card viene calcolato sugli 8 blocchi attuali. Da verificare se conviene migrare davvero i tipi DB oppure mantenere i vecchi tipi e fare solo un merge visuale nel pannello.

2. Mi chiedo se la nuova sezione "Disponibilità e piano" possa rompere il gate della Fase A, perché oggi l'onboarding obbligatorio sembra sbloccarsi alla conferma di `disponibilita`, mentre `piano_carriera` era nella Fase B. Da verificare che lo studente non venga sbloccato troppo presto o, al contrario, resti bloccato perché il codice aspetta ancora un blocco vecchio.

3. Mi chiedo se la nuova sezione "Profilo personale", che unisce interessi e autodescrizione, possa lasciare il motore in uno stato incoerente se il codice continua a cercare separatamente `interessi` e `autodescrizione`. Da verificare soprattutto `loadOnboardingState`, la percentuale di completamento, il pannello card e la pagina Profilo.

4. Mi chiedo se la rimozione del quiz soft skill possa lasciare riferimenti attivi a `soft-skill-questions.ts`, alle categorie soft dentro `competenze` o a prompt che si aspettano ancora tre categorie: academic, hard e soft. Da verificare che la Fase B non arrivi mai a uno step inesistente o che il blocco Competenze non resti incompleto perché mancano le soft skill.

5. Mi chiedo se la regola nuova sulle competenze academic e hard, non più obbligatoriamente collegate a un esame o a un'esperienza, possa entrare in conflitto con validazioni, schema dati o prompt esistenti che oggi sembrano costruiti sul principio "ogni competenza ha un'evidenza". Da verificare che il salvataggio non fallisca se manca `evidence` o un riferimento a transcript/experience.

6. Mi chiedo se il caso "libretto saltato" o "libretto senza esami utili" sia supportato davvero per le competenze accademiche, perché nello stato attuale le academic skill sembrano generate automaticamente da esami e voti. Da verificare che MIRA possa creare academic skill da risposta libera senza transcript e senza loop di richieste mancanti.

7. Mi chiedo se la gestione delle competenze dentro un unico blocco `competenze` regga bene due sotto-step separati, prima academic e poi hard. Da verificare che il blocco non venga marcato come approvato dopo la sola parte academic e che non perda la bozza quando si passa alla parte hard.

8. Mi chiedo se l'approvazione dei blocchi anche via chat possa creare ambiguità con risposte normali dello studente. Da verificare che frasi tipo "va bene", "ok", "andiamo avanti", "confermo", "sì", "direi di sì" vengano interpretate come approvazione solo quando esiste davvero una bozza approvabile, e non durante una risposta contenutistica.

9. Mi chiedo se l'approvazione via chat possa entrare in conflitto con il bottone nel pannello, soprattutto in caso di doppio click, invio ripetuto, refresh o due richieste quasi contemporanee. Da verificare idempotenza e transazioni sugli update di `card_blocks.status`.

10. Mi chiedo se la nuova domanda "Sei alla ricerca di un lavoro o aperto a future opportunità?" richieda un sotto-stato interno dentro lo step Disponibilità e piano. Da verificare che, se lo studente risponde positivamente, MIRA sappia chiedere i dettagli prima di costruire il blocco, mentre se risponde negativamente sappia saltare solo la parte dettagli ma chiedere comunque piano e direzione.

11. Mi chiedo se il toggle attivo/non attivo per la disponibilità sia già rappresentato nel contenuto JSON del blocco o se oggi venga dedotto da tag testuali come "not looking". Da verificare che il pannello e la ricerca aziende leggano un campo strutturato, non solo testo.

12. Mi chiedo se il problema dei duplicati "not looking / not looking" derivi dalla doppia scrittura legacy `card_blocks` + campi piatti di `student_profiles`. Da verificare se la deduplica va fatta solo nel rendering o anche nelle funzioni che scrivono ancora `availability` legacy.

13. Mi chiedo se la modifica sulle lingue con "certificazione e relativo livello" richieda un aggiornamento dello schema del blocco Lingue. Da verificare che il contenuto attuale non supporti solo lingua + livello e che l'aggiunta di certificazioni non causi errori nel rendering, nel form di edit del Profilo o nella normalizzazione.

14. Mi chiedo se la deduplica delle lingue tra CV e chat sia oggi abbastanza robusta. Da verificare casi come "inglese", "English", "fluent English", "C1 English", "IELTS 7.5", "corso in inglese", e che MIRA aggiorni una lingua esistente invece di aggiungerne una nuova.

15. Mi chiedo se la richiesta "Nel CV ho trovato queste lingue: {lingue}. Vanno bene?" sia sufficiente per ottenere anche i livelli quando dal CV non sono chiari. Da verificare che, se mancano livello o certificazione, MIRA non confermi un blocco Lingue incompleto senza fare una domanda mirata.

16. Mi chiedo se la chat che segue "la lingua dell'interfaccia oppure la lingua con cui lo studente scrive" possa entrare in conflitto con l'attuale setup `next-intl`, che nello stato tecnico sembra seguire la lingua dell'interfaccia. Da verificare se serve language detection per singolo messaggio o se basta lasciare il comportamento attuale.

17. Mi chiedo se permettere a MIRA di mostrare direttamente nel messaggio le competenze accademiche proposte possa rompere la regola attuale secondo cui MIRA non cita in chat il testo inglese della card. Da verificare se mostrare skill in inglese dentro chat italiana è accettabile o se vanno mostrate solo nel pannello.

18. Mi chiedo se le nuove istruzioni specifiche per studenti Bocconi su come scaricare il transcript dipendano da un valore università sempre normalizzato e affidabile. Da verificare che "Università Bocconi", "Bocconi", dominio email e altri eventuali valori non producano branch sbagliati.

19. Mi chiedo se togliere davvero la domanda fallback "studi triennale, magistrale o ciclo unico?" possa causare problemi su profili legacy o incompleti, anche se oggi il livello dovrebbe essere obbligatorio in registrazione. Da verificare se esistono utenti già creati senza `degree_level` o con dati inconsistenti.

20. Mi chiedo se l'interpretazione di abbreviazioni come "cleam" possa richiedere una mappa corsi o un prompt più specifico. Da verificare che il modello non entri nel loop "dimmi corso e anno" quando lo studente ha già risposto con una sigla di corso.

21. Mi chiedo se la rimozione della domanda di rilancio nel Profilo personale possa far approvare testi troppo vuoti o non nel merito, mentre nei comportamenti trasversali resta la regola che MIRA deve giudicare se la risposta è nel merito. Da verificare come distinguere "non fare rilanci se è breve" da "non salvare contenuto casuale o vuoto".

22. Mi chiedo se le frasi "Da togliere:" presenti nel testo debbano essere interpretate da Claude Code come istruzioni di implementazione e non come copy da mostrare all'utente. Da verificare che non finiscano per errore nei messaggi localizzati o nella UI.

23. Mi chiedo se il box giallo chiaro con scritta verde al gate debba essere implementato come messaggio chat, componente UI separato o alert nel pannello. Da verificare che non venga salvato nella conversazione come testo normale e che non influenzi lo stato della fase.

24. Mi chiedo se `student_profiles.onboarding_answers` con due conversazioni separate, `conversation` e `fase_b_conversation`, sia ancora sufficiente dopo aver spostato il piano di carriera dentro la Fase A. Da verificare dove vengono salvate le risposte sulla direzione futura e se il riepilogo/ripresa le ritrova.

25. Mi chiedo se gli after-hook attuali `after*Approved` siano troppo legati ai vecchi blocchi. Da verificare che dopo approvazione di Header, Esperienze, Disponibilità e piano, Competenze, Lingue e Profilo personale venga sempre generata la domanda corretta successiva.

26. Mi chiedo se la pagina Profilo e i componenti editabili siano ancora allineati se il pannello onboarding passa a 6 blocchi ma il DB contiene vecchie righe separate. Da verificare che lo studente possa modificare correttamente Disponibilità e piano e Profilo personale anche dopo l'onboarding.

27. Mi chiedo se la ricerca aziende e il candidate matcher leggano direttamente i vecchi blocchi `interessi`, `autodescrizione`, `piano_carriera`, `disponibilita` o i campi legacy piatti. Da verificare che il matching non perda informazioni dopo l'unione dei blocchi.

28. Mi chiedo se le valutazioni AI per associazioni, generate alla submission, si aspettino ancora 8 blocchi o soft skill dentro Competenze. Da verificare che i prompt di valutazione candidati non penalizzino o ignorino la nuova struttura.

29. Mi chiedo se gli utenti già onboardati con la struttura vecchia possano avere problemi di visualizzazione o completamento dopo il cambio. Da verificare una strategia di migrazione o compatibilità: vecchi 8 blocchi, nuovi 6 blocchi, blocchi già approvati, soft skill già presenti.

30. Mi chiedo se `forceCompleteOnboarding()` sia da aggiornare subito, perché potrebbe continuare a creare placeholder per i vecchi 8 blocchi e nascondere bug reali durante i test.

31. Mi chiedo se i prompt inline dentro `chat-onboarding.ts`, già indicati come debito tecnico, rendano rischioso fare questa modifica tutta nello stesso file. Da verificare se conviene estrarre almeno le parti di fase, schema output e testi domanda prima di cambiare struttura.

32. Mi chiedo se il vincolo dei file `use server`, che possono esportare solo funzioni async, possa creare nuovi bug se durante la ristrutturazione vengono aggiunti helper non async nello stesso file. Da verificare prima di modificare `chat-onboarding.ts`.

33. Mi chiedo se la percentuale `{X}%` della card sia ancora corretta dopo il passaggio a 6 blocchi. Da verificare se viene calcolata su blocchi approvati, su pesi diversi, su 8 blocchi legacy o su campi legacy.

34. Mi chiedo se "Fase A obbligatoria" debba ora includere più informazioni rispetto a prima e quindi cambiare `onboarding_completed` o solo il gate associazioni. Da verificare che completare Fase A non venga confuso con completare tutta la card.

35. Mi chiedo se la media "se disponibile dal libretto" sia gestita correttamente anche quando il libretto è saltato o non leggibile. Da verificare che Header possa essere approvato senza media e che il rendering non mostri valori vuoti o placeholder.

36. Mi chiedo se il parser transcript, pensato anche per estrarre media e CFU, gestisca bene transcript di università diverse da Bocconi o formati esteri. Da verificare almeno che il fallimento del parsing non blocchi l'onboarding o la creazione delle competenze accademiche via chat.

37. Mi chiedo se il passaggio da "CV parser → domande mirate sulle esperienze" a "ti farò delle domande" cambi solo il copy o anche la logica. Da verificare che il CV parser non faccia domande ridondanti se un'esperienza è già ben descritta.

38. Mi chiedo se il contenuto personale in prima persona sia compatibile con il renderer A4, soprattutto se lo studente scrive tanto e ora interessi + autodescrizione sono uniti. Da verificare limiti di lunghezza, truncation e overflow della card.

39. Mi chiedo se la normalizzazione dei contenuti in inglese resti uniforme quando lo studente scrive in italiano ma la chat può rispondere nella lingua del messaggio. Da verificare che `prose_content` salvi sempre inglese per la card, indipendentemente dalla lingua della conversazione.

40. Mi chiedo se la rimozione delle soft skill dal blocco Competenze richieda anche una pulizia nelle types condivise in `packages/types`, nei componenti UI, nei seed/test e nelle eventuali query SQL che filtrano per categoria skill.
