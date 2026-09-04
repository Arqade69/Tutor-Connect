"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { revalidatePath } from "next/cache";

export async function getOrCreateConversation(targetUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "You must be signed in to open a chat." };

  if (currentUser.id === targetUserId) {
    return { error: "You cannot start a conversation with yourself." };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!targetUser) return { error: "Target user not found." };

  let conv = await prisma.conversation.findFirst({
    where: {
      OR: [
        { participant1Id: currentUser.id, participant2Id: targetUserId },
        { participant1Id: targetUserId, participant2Id: currentUser.id },
      ],
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: {
        participant1Id: currentUser.id,
        participant2Id: targetUserId,
      },
    });
  }

  revalidatePath("/dashboard/chat");
  return { success: true, conversationId: conv.id };
}

export async function getUserConversations() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [
        { participant1Id: currentUser.id },
        { participant2Id: currentUser.id },
      ],
    },
    include: {
      participant1: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
      participant2: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
        },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return conversations.map((c) => {
    const otherUser = c.participant1Id === currentUser.id ? c.participant2 : c.participant1;
    const lastMessage = c.messages[0] ?? null;

    return {
      id: c.id,
      otherUser,
      lastMessage: lastMessage ? lastMessage.text : "No messages yet",
      lastMessageTime: lastMessage ? lastMessage.createdAt : c.updatedAt,
      isLastMessageMine: lastMessage?.senderId === currentUser.id,
    };
  });
}

export async function getConversationMessages(conversationId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      participant1: { select: { id: true, name: true, image: true, role: true } },
      participant2: { select: { id: true, name: true, image: true, role: true } },
    },
  });

  if (!conv) return { error: "Conversation not found" };

  if (conv.participant1Id !== currentUser.id && conv.participant2Id !== currentUser.id) {
    return { error: "You are not a participant in this conversation." };
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const otherUser = conv.participant1Id === currentUser.id ? conv.participant2 : conv.participant1;

  return {
    conversationId,
    otherUser,
    messages,
    currentUserId: currentUser.id,
  };
}

export async function sendMessage(conversationId: string, text: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { error: "Unauthorized" };

  if (!text || !text.trim()) return { error: "Message cannot be empty." };

  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conv) return { error: "Conversation not found" };

  if (conv.participant1Id !== currentUser.id && conv.participant2Id !== currentUser.id) {
    return { error: "Unauthorized" };
  }

  const message = await prisma.message.create({
    data: {
      conversationId,
      senderId: currentUser.id,
      text: text.trim(),
    },
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  revalidatePath("/dashboard/chat");
  return { success: true, message };
}
