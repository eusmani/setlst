import ChatView from "./ChatView";

export const dynamic = "force-dynamic";

export default async function ConversationPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <ChatView username={username} />;
}
