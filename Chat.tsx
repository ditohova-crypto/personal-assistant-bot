import { useState, useRef, useEffect } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Send,
  User,
  Bot,
  Loader2,
  Trash2,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function Chat() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: messages, isLoading } = trpc.chat.getHistory.useQuery();
  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getHistory.invalidate();
      setMessage("");
    },
  });
  const clearHistory = trpc.chat.clearHistory.useMutation({
    onSuccess: () => utils.chat.getHistory.invalidate(),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage.mutate({ content: message.trim() });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const sortedMessages = messages ? [...messages].reverse() : [];

  return (
    <AppLayout>
      <div className="space-y-4 h-[calc(100vh-4rem)] flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Чат с ассистентом
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Общайся с ИИ-ассистентом прямо здесь
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => clearHistory.mutate()}
            disabled={clearHistory.isPending || !messages?.length}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Очистить историю
          </Button>
        </div>

        <Card className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  Начни диалог с ассистентом
                </p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Он поможет с задачами, планированием и мотивацией
                </p>
              </div>
            ) : (
              sortedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-md"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-md"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        msg.role === "user"
                          ? "text-indigo-200"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 p-4">
            <div className="flex gap-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напиши сообщение..."
                className="flex-1"
                disabled={sendMessage.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={!message.trim() || sendMessage.isPending}
                className="px-4"
              >
                {sendMessage.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
