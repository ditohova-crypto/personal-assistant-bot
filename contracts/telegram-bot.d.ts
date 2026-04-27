declare module "node-telegram-bot-api" {
  export default class TelegramBot {
    constructor(token: string, options?: { polling?: boolean; webHook?: boolean });
    getMe(): Promise<{ id: number; first_name: string; username?: string }>;
    sendMessage(chatId: number | string, text: string, options?: Record<string, unknown>): Promise<Message>;
    stopPolling(): void;
    on(event: "message" | "text", listener: (msg: Message) => void): void;
    onText(regexp: RegExp, listener: (msg: Message, match: RegExpExecArray | null) => void): void;
  }

  export interface Message {
    message_id: number;
    from?: {
      id: number;
      first_name: string;
      username?: string;
      is_bot?: boolean;
    };
    chat: {
      id: number;
      type: string;
    };
    date: number;
    text?: string;
    entities?: Array<{ type: string; offset: number; length: number }>;
  }
}
