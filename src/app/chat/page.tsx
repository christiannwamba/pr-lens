import { ChatInterface } from "@/components/chat-interface";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ChatInterface chatId={null} screenMode="chat" />
    </main>
  );
}
