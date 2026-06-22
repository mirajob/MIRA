"use client";

import { useState } from "react";
import { dismissRoadmap } from "@/lib/actions/chat-profile";

export function RoadmapBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  async function handleDismiss() {
    setVisible(false);
    await dismissRoadmap();
  }

  return (
    <div className="rounded-lg border-2 border-petrol/30 bg-petrol-50 p-6 space-y-4">
      <h2 className="font-sans text-h3 text-navy">Il tuo profilo MIRA è pronto! Ecco cosa sta arrivando:</h2>

      <div className="space-y-3 text-body text-ink">
        <div>
          <p className="font-medium text-navy">Orientamento personalizzato</p>
          <p className="text-body-sm text-ink-secondary">
            MIRA analizza il tuo percorso accademico, i tuoi interessi e le tue esperienze per mostrarti quali carriere, magistrali e percorsi fanno davvero per te — non consigli generici, ma suggerimenti basati su evidenze reali del tuo profilo.
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">Simulazioni di lavoro</p>
          <p className="text-body-sm text-ink-secondary">
            Esercizi realistici che imitano task di lavoro veri — analizzare una startup come un analyst VC, risolvere un caso di consulting, valutare un bilancio. Servono a capire come ragioni e a creare evidenze concrete nel tuo profilo.
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">Matching con aziende</p>
          <p className="text-body-sm text-ink-secondary">
            Le aziende potranno cercare studenti per evidenze reali — il tuo percorso, le simulazioni, i progetti. Tu controlli cosa mostri e a chi. Inizialmente il tuo profilo sarà anonimo.
          </p>
        </div>

        <div>
          <p className="font-medium text-navy">Profilo che cresce</p>
          <p className="text-body-sm text-ink-secondary">
            Ogni interazione con MIRA — chat, simulazioni, candidature, progetti — arricchisce il tuo profilo. Non devi compilare nulla: il profilo si costruisce da solo.
          </p>
        </div>
      </div>

      <p className="text-body-sm font-medium text-petrol-700">
        Resta su MIRA — più interagisci, più il tuo profilo diventa forte.
      </p>

      <button
        onClick={handleDismiss}
        className="text-body-sm text-navy border border-border rounded-md px-4 py-2 hover:bg-white transition-colors duration-100"
      >
        Ho capito
      </button>
    </div>
  );
}
