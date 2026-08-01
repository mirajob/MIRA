# MIRA WhatsApp Agent — Specifica

**Data:** 1 agosto 2026
**Stato:** specifica in discussione con il founder, non ancora approvata per l'implementazione
**Ordine concordato:** si costruisce **dopo** il rework del funnel (onboarding + login). Portare traffico su un onboarding che fa abbandonare è uno spreco.

---

## 1. Cosa deve fare

Un numero WhatsApp pubblico di MIRA. Lo studente ci scrive (per esempio da un QR su un volantino, o dal link in bio su Instagram), l'agente gli chiede perché è lì, e a seconda della risposta lo porta su un percorso.

Il primo percorso, e l'unico al lancio, è **la card**: l'agente raccoglie disponibilità e piano di carriera dentro WhatsApp, poi manda lo studente su MIRA con un link personale. Quando arriva, la sua card è già parzialmente compilata; si registra e le risposte si attaccano al suo account.

L'obiettivo non è spostare l'onboarding su WhatsApp. È **abbassare il costo del primo passo**: rispondere a due schermate su WhatsApp non costa niente, aprire un sito e registrarsi sì. Chi ha già risposto arriva su MIRA investito.

### Regola invariante

**È sempre lo studente a scrivere per primo.** MIRA non manda mai il primo messaggio. Questa non è una preferenza, è ciò che rende il sistema gratuito e utilizzabile senza società verificata (vedi sezione 3).

---

## 2. Perché WhatsApp e non un form

Perché lo studente è già lì e non deve installare, aprire, registrarsi.

Ma la conversazione **non è a testo libero**. Le risposte libere le interpreta male, e la memoria del founder su questo è netta: il rework della card ha già abbandonato l'onboarding conversazionale in favore del form-first (vedi `MIRA_CARD_REWORK_SPEC.md`, pivot UX del 14 luglio 2026). Su WhatsApp si usa la stessa logica, con lo strumento nativo di Meta:

- **Bottoni di risposta** (massimo 3) e **messaggi lista** (fino a 10 voci) per le scelte secche, tipo il menu di apertura.
- **WhatsApp Flows** per la raccolta dati: moduli veri dentro la chat, su più schermate, con menu a tendina, selezione date, scelte multiple, campi obbligatori e validazione. Sono gli stessi campi che lo studente troverebbe su MIRA.

L'AI resta fuori dal percorso di raccolta. Serve solo, eventualmente, a rimettere in forma i testi scritti a mano libera (il piano di carriera), esattamente come fa oggi il bottone "Migliora con MIRA" sul sito. Se l'AI non risponde, il flusso deve funzionare lo stesso e salvare il testo grezzo.

---

## 3. Vincoli di Meta e cosa comportano

Verificati il 1 agosto 2026. Meta cambia spesso le regole: **rileggere prima di implementare**.

### Società non registrata: non blocca la partenza

Il tetto di 250 contatti in 24 ore delle aziende non verificate si applica **solo alle conversazioni che iniziamo noi**. Le conversazioni iniziate dall'utente si possono servire senza limite anche senza verifica aziendale. Il nostro flusso è interamente iniziato dall'utente, quindi si parte senza società.

Cosa resta precluso finché non c'è una società verificata:

- mandare noi il primo messaggio a qualcuno;
- mandare un sollecito a chi si è fermato a metà, se sono passate più di 24 ore;
- superare il tetto quando servirà.

### La finestra delle 24 ore governa il disegno

Si può rispondere liberamente solo entro 24 ore dall'ultimo messaggio dell'utente. Dopo servono messaggi pre-approvati, a pagamento, che rientrano nel tetto dei 250.

Conseguenza di prodotto, non tecnica: **la conversazione deve chiudersi in una sessione sola.** Il link a MIRA si dà lì, subito. Chi abbandona a metà è perso, e va bene così: si recupera con la distribuzione, non con i solleciti.

Questa è anche la ragione per cui l'agente raccoglie poco (sezione 4). Ogni schermata in più è gente che si ferma.

### Requisiti operativi

| Cosa | Nota |
|---|---|
| Numero di telefono dedicato | Non deve avere né aver avuto WhatsApp sopra. Non può essere un numero personale in uso. |
| Verifica del numero | Un SMS o una chiamata vocale con codice, **una volta sola**. Serve la SIM dentro un telefono quel giorno. Dopo, il numero vive sui server di Meta e la SIM può tornare nel cassetto. |
| Account Meta Business | Creabile da persona fisica. La verifica aziendale (che richiede documenti societari) serve solo per superare i limiti. |
| Nome visualizzato | Va approvato da Meta. Usare "MIRA". |
| Metodo di pagamento | Meta chiede una carta registrata anche se queste conversazioni non generano addebiti. Da confermare al momento del setup. |
| Webhook HTTPS | Endpoint pubblico che riceve i messaggi. Sta in `apps/web`. |

### Cosa non si fa

Le librerie non ufficiali che pilotano un WhatsApp normale da un server (Baileys, whatsapp-web.js e simili) sono contro le regole di Meta e portano al ban del numero senza preavviso. Fuori discussione per un prodotto in produzione.

---

## 4. Il percorso "card": cosa raccoglie l'agente

Solo due cose: **disponibilità** e **piano di carriera**. Sono i due blocchi che il rework del funnel ha messo per primi, sono gli unici che si compilano bene senza documenti, e insieme fanno una schermata Flow da circa due minuti.

Restano fuori di proposito:

- **Libretto e CV.** Caricare un PDF su WhatsApp è possibile ma il parsing, la revisione dei campi e la correzione degli errori vogliono uno schermo vero. Si fanno su MIRA.
- **Esperienze, competenze, lingue, profilo personale.** Troppo lunghi per la finestra delle 24 ore.

Bozza delle schermate del Flow (i campi definitivi vanno allineati a quelli reali della card al momento dell'implementazione, non copiati da qui):

**Schermata 1 — Disponibilità**
- Sto cercando / Sono aperto a opportunità (scelta)
- Tipo di esperienza (tendina)
- Ambito (tendina)
- Città (testo)
- Da quando (data)
- Per quanto (tendina)

**Schermata 2 — Piano di carriera**
- Prossimi passi di studio o formazione (testo lungo)
- Ruolo in cui vorresti inserirti subito dopo (testo)
- Dove punti ad arrivare (testo lungo)
- Nota: "scrivi come parli, ci pensiamo noi a sistemarlo"

**Schermata 3 — Chiusura**
- Riepilogo di quanto raccolto
- Bottone che porta al link personale

Dopo il Flow, un ultimo messaggio con il link e una frase sola: la tua card è già iniziata, finiscila qui.

---

## 5. Il menu di apertura e i percorsi futuri

L'apertura non è "ciao, costruiamo la card". È **"perché sei qui?"**, con bottoni.

Questo perché il numero deve reggere più motivi di arrivo. Il founder ha già in mente altre funzioni per attrarre utenti, per esempio **trovare il coinquilino**, che oggi non esiste su MIRA. Il numero WhatsApp sarà lo stesso: cambia solo il bottone che si preme.

### Architettura: un router, non una conversazione

Il codice non deve essere una conversazione con dei rami dentro. Deve essere:

1. un **router** che riceve il messaggio, guarda a che punto è quella persona e a quale percorso appartiene;
2. dei **percorsi** registrati, ognuno con la sua voce di menu, il suo Flow e la sua chiusura.

Aggiungere "trova il coinquilino" più avanti deve voler dire aggiungere un percorso e una voce di menu, non toccare il router. Se questa separazione non c'è dall'inizio, il secondo percorso costa quanto il primo.

### Regola sulle voci di menu

**Nessun bottone per cose che non esistono.** Un'opzione che risponde "presto disponibile" fa più danno che non averla. Il menu cresce quando cresce il prodotto.

Al lancio le voci reali sono tre:

1. **Voglio creare la mia card** → il percorso della sezione 4.
2. **Voglio vedere le associazioni della mia università** → link alle pagine pubbliche delle associazioni, nessuna raccolta dati.
3. **Ho una domanda** → si mette da parte la conversazione e risponde una persona.

Il percorso coinquilino entra come quarta voce quando la funzione esiste su MIRA, non prima.

---

## 6. Il collegamento con l'account: il pezzo delicato

È qui che il progetto riesce o fallisce.

### Meccanica

1. Durante la conversazione le risposte finiscono in una riga di `whatsapp_leads`, identificata dal numero di telefono.
2. A fine Flow si genera un **token monouso** e si manda il link `mirajob.cloud/wa/<token>`.
3. Il link apre una pagina che mostra **cosa abbiamo già raccolto**, prima della registrazione. Vedere il proprio contenuto già lì è tutta la leva: senza questo, il link è un normale invito a registrarsi.
4. Lo studente si registra o accede.
5. Al primo accesso valido, i dati del lead si copiano nella card e il lead si marca come consumato.

### Decisioni da rispettare

- **Il token non porta dentro nessun account.** Non fa accesso, non crea sessione. Apre solo una pagina che mostra dei dati e invita a registrarsi. Un link che facesse accedere sarebbe un buco di sicurezza: WhatsApp si inoltra.
- **Il token scade** (proposta: 7 giorni) ed è **monouso**: consumato alla prima registrazione andata a buon fine.
- **Il numero di telefono non è una prova di identità.** Non si usa per riconoscere un utente esistente né per unire account.
- **Se il token è già stato consumato**, la pagina non mostra più i dati: manda al login normale.
- **Preferire l'accesso con Google** nella pagina di atterraggio, perché è un clic contro un form. L'email e password resta come alternativa.

### Se un utente già registrato scrive su WhatsApp

Non lo sappiamo, e non dobbiamo indovinarlo dal numero. Il percorso è lo stesso; alla fine, se in fase di registrazione risulta un account esistente, si fa accedere e i dati raccolti si propongono come aggiornamento della card, non si sovrascrivono in automatico.

---

## 7. Dati e privacy

Stiamo raccogliendo dati personali di persone che **non sono ancora utenti** e non hanno accettato niente. Va gestito, non rimandato.

- Il **primo messaggio dell'agente** contiene il link all'informativa privacy, prima di qualunque domanda.
- Il Flow non chiede dati che non servono al percorso scelto.
- I lead che **non si convertono si cancellano** dopo un periodo definito (proposta: 90 giorni), con un job programmato.
- La tabella `whatsapp_leads` sta sotto RLS come tutto il resto: nessun accesso dal client, solo server.
- Il numero di telefono si conserva finché serve al collegamento, poi si cancella con il lead. Non finisce nel profilo.
- Va aggiornata l'informativa privacy con il canale WhatsApp e con Meta come destinatario.

Il dettaglio di regole e policy va allineato a `07_MIRA_SECURITY_PRIVACY.md` in fase di implementazione.

---

## 8. Dati da salvare

Bozza, da tradurre in migrazione vera contro `03_MIRA_DATABASE_SCHEMA.md`:

```
whatsapp_leads
  id
  phone_e164            numero, unico per lead attivo
  path                  quale percorso (card, associazioni, domanda, ...)
  state                 a che punto è la conversazione
  collected_json        le risposte raccolte
  token                 monouso, per il link
  token_expires_at
  consumed_at           null finché non si registra
  claimed_by_profile_id chi lo ha consumato
  created_at / updated_at
```

Serve anche un registro dei messaggi grezzi in entrata e uscita, separato, per poter capire cosa è successo quando qualcosa non torna.

---

## 9. Fasi

**Fase 0 — burocrazia (giorni di attesa, poche ore di lavoro).**
SIM nel telefono, numero verificato, account Meta Business, nome visualizzato approvato, app creata, token di accesso, webhook di prova che risponde "ricevuto". Da iniziare per prima perché è l'unica parte che non dipende da noi.

**Fase 1 — router e conversazione.**
Webhook, tabella dei lead, menu di apertura con i tre bottoni, percorso "ho una domanda" e percorso "associazioni" (che sono solo risposte con link). A fine fase il numero è vivo e utile, anche senza il Flow.

**Fase 2 — il Flow della card.**
Disegno delle schermate, pubblicazione su Meta, gestione della risposta del Flow, salvataggio nel lead.

**Fase 3 — il collegamento.**
Pagina `/wa/<token>`, anteprima dei dati raccolti, registrazione, copia nella card, consumo del token.

**Fase 4 — misura.**
Quanti scrivono, quanti finiscono il Flow, quanti aprono il link, quanti si registrano. Senza questi quattro numeri non si può dire se il canale funziona.

Stima: due settimane di lavoro, più i giorni di attesa di Meta in mezzo.

---

## 10. Come si capisce se ha funzionato

La domanda vera non è "quanti utenti arrivano da WhatsApp". È **se converte meglio del link diretto al sito**. Alla fine la persona si registra comunque; l'unico guadagno è psicologico.

Va quindi tenuto un confronto: la stessa distribuzione, metà verso WhatsApp e metà verso il sito. Se il tasso di registrazione non è sensibilmente più alto da WhatsApp, il canale non vale la manutenzione e si chiude.

---

## 11. Punti aperti

1. Il metodo di pagamento richiesto da Meta va confermato al setup.
2. Da verificare se i Flows hanno requisiti aggiuntivi per gli account non verificati.
3. La modalità del Flow: quella semplice, senza endpoint di scambio dati, restituisce le risposte tutte alla fine ed evita la gestione delle chiavi di cifratura. Va confermato che basti per queste schermate.
4. Lingua: al lancio solo italiano. L'inglese quando serve.
5. Cosa succede se la stessa persona ricomincia da capo dopo giorni: si riparte o si riprende il lead esistente.
