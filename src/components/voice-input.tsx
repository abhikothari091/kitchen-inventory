"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputProps {
  onResult: (transcript: string) => void;
  onClose: () => void;
  label?: string;
}

export function VoiceInput({
  onResult,
  onClose,
  label = "Speak now...",
}: VoiceInputProps) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<unknown>(null);

  const startListening = useCallback(() => {
    const win = window as unknown as Record<string, unknown>;
    const SpeechRecognitionCtor =
      (win.SpeechRecognition || win.webkitSpeechRecognition) as
        | (new () => {
            continuous: boolean;
            interimResults: boolean;
            lang: string;
            onresult: (event: { results: { isFinal: boolean; 0: { transcript: string } }[] }) => void;
            onend: () => void;
            onerror: (event: { error: string }) => void;
            start: () => void;
            stop: () => void;
          })
        | undefined;

    if (!SpeechRecognitionCtor) {
      setError("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i] as unknown as { isFinal: boolean; 0: { transcript: string } };
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognition.onerror = (event) => {
      setListening(false);
      if (event.error === "no-speech") {
        setError("No speech detected. Tap the mic to try again.");
      } else {
        setError("Voice input failed. Please try again.");
      }
    };

    setError(null);
    setTranscript("");
    setListening(true);
    recognition.start();
  }, []);

  function stopListening() {
    const r = recognitionRef.current as { stop: () => void } | null;
    r?.stop();
    setListening(false);
  }

  function confirmTranscript() {
    if (transcript.trim()) {
      onResult(transcript.trim());
    }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">{label}</p>

      <button
        type="button"
        onClick={listening ? stopListening : startListening}
        className={cn(
          "mx-auto w-20 h-20 rounded-full flex items-center justify-center transition-all",
          listening
            ? "bg-red-100 text-red-600 animate-pulse shadow-lg shadow-red-200"
            : "bg-primary/10 text-primary hover:bg-primary/20"
        )}
      >
        {listening ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {transcript && (
        <div className="space-y-3">
          <div className="p-3 rounded-lg bg-muted text-sm">{transcript}</div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={confirmTranscript}>
              Use This
            </Button>
          </div>
        </div>
      )}

      {!transcript && !listening && !error && (
        <p className="text-xs text-muted-foreground">
          Tap the mic to start speaking
        </p>
      )}
    </div>
  );
}

const WORD_NUMS: Record<string, number> = {
  a: 1, an: 1, one: 1, some: 2, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

const UNIT_PATTERN = "cans?|jars?|bags?|boxes?|bottles?|packs?|rolls?|pcs|pieces?|cartons?|bunch(?:es)?|loaves?|loaf|dozen|lbs?|kg|oz|liters?|gallons?";

function parseNumber(s: string): number | undefined {
  const n = parseInt(s);
  if (!isNaN(n)) return n;
  return WORD_NUMS[s.toLowerCase()];
}

export function parseVoiceItem(transcript: string): {
  name: string;
  quantity?: number;
  unit?: string;
  location?: string;
} {
  let text = transcript.toLowerCase().trim();

  let location: string | undefined;
  const locMatch = text.match(/\s+in\s+(?:the\s+)?(.+?)$/);
  if (locMatch) {
    location = locMatch[1].trim();
    text = text.slice(0, locMatch.index).trim();
  }

  const numWord = Object.keys(WORD_NUMS).join("|");
  const qtyUnitRe = new RegExp(`^(\\d+|${numWord})\\s+(${UNIT_PATTERN})\\s+(?:of\\s+)?(.+)$`, "i");
  const qtyUnitMatch = text.match(qtyUnitRe);
  if (qtyUnitMatch) {
    return {
      quantity: parseNumber(qtyUnitMatch[1]),
      unit: qtyUnitMatch[2].replace(/s$/, "").replace(/ves$/, "f"),
      name: qtyUnitMatch[3].trim(),
      location,
    };
  }

  const qtyRe = new RegExp(`^(\\d+|${numWord})\\s+(.+)$`, "i");
  const qtyMatch = text.match(qtyRe);
  if (qtyMatch) {
    return {
      quantity: parseNumber(qtyMatch[1]),
      name: qtyMatch[2].trim(),
      location,
    };
  }

  const aMatch = text.match(/^(?:a|an)\s+(.+)$/);
  if (aMatch) {
    return { quantity: 1, name: aMatch[1].trim(), location };
  }

  return { name: text, location };
}

export function parseVoiceBatch(
  transcript: string
): Array<{ name: string; quantity?: number; unit?: string }> {
  const items = transcript
    .split(/,\s*|(?:\s+and\s+)/i)
    .map((s) => s.trim())
    .filter(Boolean);

  return items.map((item) => {
    const numWord = Object.keys(WORD_NUMS).concat(["some"]).join("|");
    const re = new RegExp(
      `^(\\d+|${numWord})\\s+(?:(${UNIT_PATTERN})\\s+(?:of\\s+)?)?(.+)$`,
      "i"
    );
    const match = item.match(re);

    if (match) {
      const qty = parseNumber(match[1]) ?? (match[1].toLowerCase() === "some" ? 2 : 1);
      return {
        quantity: qty,
        unit: match[2]?.replace(/s$/, ""),
        name: match[3].trim(),
      };
    }
    return { name: item };
  });
}
