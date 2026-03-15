import { ChatInterface } from "@/components/chat-interface";

type ChatThreadPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChatThreadPage({
  params,
}: ChatThreadPageProps) {
  const { id } = await params;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <ChatInterface chatId={id} routeMode="chat" />
    </main>
  );
}
