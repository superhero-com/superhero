import React, { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function AiAssistantBar() {
  const [query, setQuery] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query.trim();
    setQuery("");
    setIsExpanded(true);
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const responses = [
        "I can help you explore topics, trade tokens, or learn about Superhero features. What would you like to know?",
        "You can create your own tokenized topic by going to Topics > Create. Each topic creates a DAO with its own treasury!",
        "To trade tokens, simply click on any topic card to view its details and trading options.",
        "Superhero uses bonding curves for token pricing - the more people buy, the higher the price goes!",
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { role: "assistant", content: randomResponse }]);
      setIsLoading(false);
    }, 1000);
  };

  const handleFocus = () => {
    if (messages.length > 0) {
      setIsExpanded(true);
    }
  };

  const handleClose = () => {
    setIsExpanded(false);
  };

  const suggestions = [
    "How do I create a topic?",
    "What are bonding curves?",
    "How to trade tokens?",
  ];

  return (
    <div
      className={`
        relative rounded-2xl overflow-hidden
        transition-all duration-300 ease-out
        ${isExpanded ? "bg-[#0a0a0f] border border-white/20 shadow-2xl" : ""}
      `}
    >
      {/* Expanded chat messages */}
      {isExpanded && messages.length > 0 && (
        <div className="max-h-[300px] overflow-y-auto p-4 space-y-3">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`
                  max-w-[80%] px-4 py-2 rounded-2xl text-sm
                  ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-white/10 text-white/90"
                  }
                `}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-4 py-2 rounded-2xl">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-white/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="relative">
        <div
          className={`
            flex items-center gap-3 px-4 py-3
            ${!isExpanded ? "bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-colors" : "border-t border-white/10"}
          `}
        >
          <span className="text-xl">🤖</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder="Ask Superhero AI anything..."
            className="
              flex-1 bg-transparent border-none outline-none
              text-white placeholder-white/40 text-sm
            "
          />
          <button
            type="submit"
            disabled={!query.trim() || isLoading}
            className="
              p-2 rounded-xl
              bg-gradient-to-r from-purple-500 to-pink-500
              text-white
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:from-purple-600 hover:to-pink-600
              transition-all duration-200
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          {isExpanded && (
            <button
              type="button"
              onClick={handleClose}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* Suggestions (only when not expanded and no messages) */}
      {!isExpanded && messages.length === 0 && (
        <div className="flex flex-wrap gap-2 mt-3 justify-center">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setQuery(suggestion);
                inputRef.current?.focus();
              }}
              className="
                px-3 py-1.5 rounded-full
                bg-white/5 border border-white/10
                text-xs text-white/60
                hover:bg-white/10 hover:text-white/80
                transition-colors
              "
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

