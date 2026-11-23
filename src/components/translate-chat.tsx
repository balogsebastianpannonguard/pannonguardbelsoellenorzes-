"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Copy, LoaderCircle, MessagesSquare, RotateCcw, SendHorizontal } from "lucide-react";
import { Feedback, Panel, buttonClass } from "@/components/ui";
import { askAboutTranslation } from "@/lib/actions/translate";

type Turn = { role: "user" | "assistant"; content: string };

const QUICK = [
  "Foglald össze a dokumentumot 5 pontban.",
  "Ellenőrizd a fordítást: van-e benne pontatlanság vagy kihagyás?",
  "Írd át a fordítást közérthetőbben.",
  "Magyarázd el a bizonytalan szakszavak jelentését.",
];

/** Csevegés a fordításról: a Claude ismeri az eredetit, a fordítást és a kifejezéseket. */
export function TranslationChat({ id, aiOn }: { id: string; aiOn: boolean }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, pending]);

  function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    const next: Turn[] = [...turns, { role: "user", content: question }];
    setTurns(next);
    setInput("");
    setError(undefined);
    start(async () => {
      const result = await askAboutTranslation(id, next);
      if (result.error || !result.reply) {
        setError(result.error ?? "Nem érkezett válasz.");
        setTurns(next.slice(0, -1));
        setInput(question);
        return;
      }
      setTurns([...next, { role: "assistant", content: result.reply }]);
    });
  }

  return (
    <Panel
      title="Kérdezz a fordításról"
      icon={MessagesSquare}
      action={
        turns.length > 0 && (
          <button type="button" onClick={() => setTurns([])} className={buttonClass("ghost", "sm")}>
            <RotateCcw size={14} aria-hidden /> Új beszélgetés
          </button>
        )
      }
    >
      {!aiOn ? (
        <p className="text-sm text-white/55">A csevegéshez a szerveren ANTHROPIC_API_KEY szükséges.</p>
      ) : (
        <div className="space-y-3">
          {turns.length === 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-white/45">
                Az AI (Anthropic Claude) látja az eredeti szöveget és a fordítást. Kérhetsz összefoglalót, magyarázatot,
                átfogalmazást vagy ellenőrzést.
              </p>
              <div className="flex flex-wrap gap-2">
                {QUICK.map((item) => (
                  <button key={item} type="button" onClick={() => send(item)} className={buttonClass("secondary", "sm")}>
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div ref={listRef} className="max-h-[32rem] space-y-3 overflow-y-auto pr-1">
              {turns.map((turn, index) =>
                turn.role === "user" ? (
                  <div key={index} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-mint/15 px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {turn.content}
                  </div>
                ) : (
                  <div key={index} className="group max-w-[92%] rounded-2xl rounded-bl-md border border-white/8 bg-white/4 px-4 py-3 text-sm leading-relaxed">
                    <div className="whitespace-pre-wrap">{turn.content}</div>
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(turn.content).catch(() => undefined);
                        setCopied(index);
                        setTimeout(() => setCopied(null), 1500);
                      }}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-white/45 hover:text-white"
                    >
                      {copied === index ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
                      {copied === index ? "Másolva" : "Válasz másolása"}
                    </button>
                  </div>
                ),
              )}
              {pending && (
                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/4 px-4 py-2.5 text-sm text-white/55">
                  <LoaderCircle size={15} aria-hidden className="animate-spin" /> Gondolkodom…
                </div>
              )}
            </div>
          )}

          <Feedback error={error} />
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              rows={2}
              maxLength={4000}
              placeholder="Kérdezz a fordításról… (Enter: küldés, Shift+Enter: új sor)"
              aria-label="Kérdés a fordításról"
              className="pg-field pg-input min-h-11 flex-1 resize-y rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25"
            />
            <button type="submit" disabled={pending || !input.trim()} className={`${buttonClass("primary")} self-end`} aria-label="Küldés">
              {pending ? <LoaderCircle size={17} aria-hidden className="animate-spin" /> : <SendHorizontal size={17} aria-hidden />}
            </button>
          </form>
        </div>
      )}
    </Panel>
  );
}
