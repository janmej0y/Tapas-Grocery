"use client";

import { useState } from "react";
import { Bot, Send, X, Sparkles, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";

type Message = {
  role: "customer" | "assistant";
  content: string;
};

export function AiAssistant() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Ask me what is in stock, what to cook, or how delivery fees work."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function sendMessage() {
    const message = input.trim();

    if (!message) {
      return;
    }

    setMessages((current) => [...current, { role: "customer", content: message }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message })
      });
      const data = await response.json();

      setMessages((current) => [...current, { role: "assistant", content: data.answer ?? "I could not answer that right now." }]);
    } catch {
      toast.error("Assistant is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
      <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-leaf-50 p-2 text-primary-accent">
            <Sparkles className="h-5 w-5" />
          </span>
          <h2 className="text-2xl font-black text-heading">{t("assistant")}</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {messages.length === 0 ? <p className="text-sm text-slate-500">Ask Tapas Assistant anything about groceries, orders, or policies...</p> : null}
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`rounded-lg px-4 py-3 text-sm ${message.role === "assistant" ? "bg-leaf-50 text-heading" : "bg-heading text-white"}`}>
              {message.content}
            </div>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                sendMessage();
              }
            }}
            className="min-w-0 flex-1 rounded-md border border-black/10 px-3 py-2"
            placeholder={t("askAssistant")}
          />
          <button type="button" onClick={sendMessage} disabled={isLoading} className="rounded-md bg-primary-accent px-4 py-2 text-white hover:bg-leaf-800 disabled:bg-gray-300" aria-label="Send message">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
