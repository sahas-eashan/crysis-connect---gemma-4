"use client";

import { useState } from "react";
import { Bot, Languages, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { generateOfflineAdvisorInsight, type OfflineAdvisorInsight } from "@/lib/gemma/local-client";
import type { CachedEmergencySyncPackage } from "@/lib/offline/emergency-cache";

type Props = {
  pkg: CachedEmergencySyncPackage | null;
  lat?: number | null;
  lon?: number | null;
};

export function GemmaOfflineAdvisor({ pkg, lat, lon }: Props) {
  const [language, setLanguage] = useState<"english" | "sinhala" | "tamil">("english");
  const [lowLiteracy, setLowLiteracy] = useState(true);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<OfflineAdvisorInsight | null>(null);
  const [message, setMessage] = useState("Gemma 4 runs against cached verified data only.");

  async function generate() {
    if (!pkg) {
      setMessage("Sync an emergency package first.");
      return;
    }
    setLoading(true);
    setMessage("Preparing Gemma 4 local guidance...");
    try {
      const next = await generateOfflineAdvisorInsight({ pkg, lat, lon, language, lowLiteracy });
      setInsight(next);
      setMessage("Guidance prepared locally. Verify routes and official instructions.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to prepare local guidance.");
    } finally {
      setLoading(false);
    }
  }

  const localized = insight?.translations[language] || insight?.translations.english;

  return (
    <Card>
      <CardTitle className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-primary" />
        Gemma 4 Local Guidance
      </CardTitle>
      <CardDescription className="mt-2">
        Uses cached safe zones, alerts, disaster polygons, and GPS grounding. No cloud model is required.
      </CardDescription>

      <div className="mt-5 flex flex-wrap gap-2">
        {(["english", "sinhala", "tamil"] as const).map((item) => (
          <button
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
              language === item ? "border-primary bg-primary text-slate-950" : "border-slate-700 text-slate-200"
            }`}
            key={item}
            onClick={() => setLanguage(item)}
            type="button"
          >
            <Languages className="mr-1 inline h-3 w-3" />
            {item}
          </button>
        ))}
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-200">
          <input checked={lowLiteracy} onChange={(event) => setLowLiteracy(event.target.checked)} type="checkbox" />
          short instructions
        </label>
      </div>

      <div className="mt-5">
        <Button disabled={loading || !pkg} onClick={generate}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          What should I do now?
        </Button>
      </div>

      <p className="mt-4 text-sm text-muted">{message}</p>

      {insight ? (
        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-white">{insight.headline}</p>
            <Badge>advisory</Badge>
          </div>
          {localized ? <p className="mt-3 text-sm text-slate-200">{localized}</p> : null}
          <div className="mt-4 space-y-2 text-sm text-slate-200">
            {insight.nextSteps.map((step) => (
              <p key={step}>- {step}</p>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">{insight.safeZoneExplanation}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {insight.checklist.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>
          {insight.warnings.map((warning) => (
            <p className="mt-3 text-xs text-amber-200" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
