import { ChatInterface } from "@/components/chat-interface";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <ChatInterface screenMode="landing" />
    </main>
  );
}
