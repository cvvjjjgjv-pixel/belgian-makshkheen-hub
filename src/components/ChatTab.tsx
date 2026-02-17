import { useState } from "react";
import { Send } from "lucide-react";

interface Message {
  id: number;
  text: string;
  sent: boolean;
  time: string;
}

const initialMessages: Message[] = [
  { id: 1, text: "Salam les frères! Prêts pour ce soir? 🔴🟡", sent: false, time: "18:30" },
  { id: 2, text: "Toujours prêts! EST champions! 💪", sent: true, time: "18:31" },
  { id: 3, text: "Le tifo est prêt, ça va être incroyable!", sent: false, time: "18:32" },
  { id: 4, text: "Yalla les gars on met le feu 🔥🔥🔥", sent: true, time: "18:33" },
  { id: 5, text: "Qui vient au rassemblement à la Grand Place?", sent: false, time: "18:35" },
  { id: 6, text: "Moi je suis déjà en route!", sent: true, time: "18:36" },
];

const ChatTab = () => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMsg: Message = {
      id: messages.length + 1,
      text: input,
      sent: true,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([...messages, newMsg]);
    setInput("");
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 160px)" }}>
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Chat Général 🔴🟡</h2>
        <p className="text-xs text-muted-foreground">245 membres en ligne</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] px-4 py-2.5 rounded-2xl ${
              msg.sent
                ? "self-end gradient-sent rounded-br-sm"
                : "self-start bg-secondary rounded-bl-sm"
            }`}
          >
            <p className="text-sm text-foreground">{msg.text}</p>
            <p className="text-[10px] text-foreground/50 mt-1">{msg.time}</p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t border-border flex gap-3 items-center">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Votre message..."
          className="flex-1 bg-secondary rounded-full px-5 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <button
          onClick={sendMessage}
          className="w-11 h-11 rounded-full bg-accent flex items-center justify-center text-accent-foreground flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatTab;
