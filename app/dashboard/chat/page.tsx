import { getUserConversations } from "@/actions/chat";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { ChatRoomClient } from "./ChatRoomClient";

export default async function ChatPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const conversations = await getUserConversations();

  return (
    <ChatRoomClient
      initialConversations={conversations}
      currentUserId={currentUser.id}
    />
  );
}
