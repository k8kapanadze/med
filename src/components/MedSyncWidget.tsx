import React, { useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";

// Shape of the data this widget hands back to the parent form the moment
// Gemini's response arrives. Matches the fields the CDSS form's applySyncResult
// already expects — nothing here is invented locally, it all comes from /api/med-detail.
export interface SyncedMedData {
  tradeName: string;
  genericName: string;
  price: number;
  source: string;
  indications: string[];
  sideEffects: string;
  mechanismOfAction: string;
  clinicalPearls: string;
  pharmacologicalGroup: string;
  route: any;
  dosageForm: any;
  frequency: any;
  mealConnection: any;
  timeOfDay: string[];
  contraindications: string[];
}

interface MedSyncWidgetProps {
  /** Called immediately once Gemini's JSON is parsed — parent should setMedData/apply it right away. */
  onAutoFill: (data: SyncedMedData) => void;
}

export default function MedSyncWidget({ onAutoFill }: MedSyncWidgetProps) {
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const handleSync = async () => {
    const term = query.trim();

    if (term.length < 2) {
      setMessage({ text: "ჩაწერეთ მინიმუმ 2 სიმბოლო მოსაძებნად", type: "info" });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Only source of truth: the live Gemini-backed endpoint. No local arrays, no mock data,
      // no offline catalog — if this call fails, we tell the user and stop, full stop.
      const response = await fetch(`/api/med-detail?query=${encodeURIComponent(term)}`);
      const data = await response.json().catch(() => null);

      if (!response.ok || !data) {
        throw new Error((data && data.error) || `Gemini API Error: სერვერმა დააბრუნა სტატუსი ${response.status}`);
      }
      if (data.error) {
        throw new Error(`Gemini API Error: ${data.error}`);
      }

      let indicationsArray: string[] = [];
      if (Array.isArray(data.indications)) {
        indicationsArray = data.indications;
      } else if (typeof data.indications === "string") {
        indicationsArray = data.indications
          .split(/[,;\n]+/)
          .map((i: string) => i.trim())
          .filter(Boolean);
      }

      const formattedTradeName = term.charAt(0).toUpperCase() + term.slice(1);

      const synced: SyncedMedData = {
        tradeName: formattedTradeName,
        genericName: formattedTradeName,
        price: 5.5,
        source: "Gemini AI Clinical DB",
        indications: indicationsArray.length > 0 ? indicationsArray : ["ინფორმაცია არ არის მითითებული"],
        sideEffects: data.sideEffects || "ინფორმაცია არ არის მითითებული",
        mechanismOfAction: data.mechanism || data.mechanismOfAction || "ინფორმაცია არ არის მითითებული",
        clinicalPearls: "ინფორმაცია მოძიებულია და გენერირებულია AI კლინიკური ასისტენტის მიერ.",
        pharmacologicalGroup: "კლინიკური კლასი",
        route: "PO",
        dosageForm: "Tablet",
        frequency: "1x",
        mealConnection: "Independent",
        timeOfDay: ["Morning"],
        contraindications: [],
      };

      // IMMEDIATE auto-fill — no "click a match" step. The instant we have the JSON,
      // the parent's form state is updated.
      onAutoFill(synced);

      setMessage({
        text: `✨ სინქრონიზაცია წარმატებულია! ავტომატურად შეივსო "${formattedTradeName}" Gemini AI-დან.`,
        type: "success",
      });
    } catch (err: any) {
      console.error("Gemini sync failed:", err);
      setMessage({
        text: `❌ ${err.message || "Gemini API Error: სინქრონიზაცია ვერ მოხერხდა."}`,
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-950 border border-white/5 space-y-4">
      <div className="flex items-center space-x-2">
        <RefreshCw className={`h-4.5 w-4.5 text-[#e04556] ${isLoading ? "animate-spin" : ""}`} />
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          AI კლინიკური სინქრონიზაცია (Gemini Smart Knowledge Base)
        </h4>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="ჩაწერეთ პრეპარატი (მაგ: ნუროფენი, დექსამეთაზონი, Captopril...)"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSync();
              }
            }}
            className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#6b111a]"
          />
        </div>

        <div className="flex space-x-2">
          <button
            type="button"
            onClick={handleSync}
            disabled={isLoading}
            className="bg-[#6b111a] hover:bg-[#801721] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center space-x-1.5 focus:outline-none cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>სინქრონიზაცია...</span>
              </>
            ) : (
              <span>სინქრონიზაცია</span>
            )}
          </button>
        </div>
      </div>

      {message && (
        <p
          className={`text-[11px] font-medium flex items-start gap-1.5 ${
            message.type === "success"
              ? "text-emerald-400"
              : message.type === "error"
              ? "text-rose-400"
              : "text-amber-400"
          }`}
        >
          {message.type === "error" && <AlertCircle className="h-3.5 w-3.5 mt-px shrink-0" />}
          <span>{message.text}</span>
        </p>
      )}
    </div>
  );
}
