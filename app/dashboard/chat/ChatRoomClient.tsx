"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
} from "@/actions/chat";
import {
  SendIcon,
  SearchIcon,
  ChatIcon,
  UserIcon,
  SparklesIcon,
} from "@/components/icons";

type ConversationItem = {
  id: string;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
    role: string;
    image?: string | null;
  };
  lastMessage: string;
  lastMessageTime: Date;
  isLastMessageMine: boolean;
};

type MessageItem = {
  id: string;
  senderId: string;
  text: string;
  createdAt: Date;
  sender: {
    id: string;
    name: string | null;
    image?: string | null;
  };
};

export function ChatRoomClient({
  initialConversations,
  currentUserId,
}: {
  initialConversations: ConversationItem[];
  currentUserId: string;
}) {
  const searchParams = useSearchParams();
  const initialConvId = searchParams.get("convId");

  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [activeConvId, setActiveConvId] = useState<string | null>(
    initialConvId ?? (initialConversations[0]?.id ?? null)
  );

  const [activePartner, setActivePartner] = useState<{
    id: string;
    name: string | null;
    role: string;
    image?: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPending, startTransition] = useTransition();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Filter conversations search
  const filteredConversations = conversations.filter((c) =>
    (c.otherUser.name ?? c.otherUser.email)
      .toLowerCase()
      .includes(searchQuery.toLowerCase())
  );

  // Fetch messages for active conversation
  const loadMessages = async (convId: string) => {
    const res = await getConversationMessages(convId);
    if ("messages" in res && res.messages) {
      setMessages(res.messages as MessageItem[]);
      if (res.otherUser) {
        setActivePartner(res.otherUser);
      }
    }
  };

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    }
  }, [activeConvId]);

  // Real-time polling every 3 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      // Sync conversations list
      const updatedConvs = await getUserConversations();
      if (Array.isArray(updatedConvs)) {
        setConversations(updatedConvs);
      }

      // Sync current message thread
      if (activeConvId) {
        const res = await getConversationMessages(activeConvId);
        if ("messages" in res && res.messages) {
          setMessages(res.messages as MessageItem[]);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [activeConvId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeConvId || !messageText.trim()) return;

    const textToSend = messageText.trim();
    setMessageText("");

    // Optimistic UI update
    const tempMsg: MessageItem = {
      id: "temp-" + Date.now(),
      senderId: currentUserId,
      text: textToSend,
      createdAt: new Date(),
      sender: {
        id: currentUserId,
        name: "You",
      },
    };
    setMessages((prev) => [...prev, tempMsg]);

    startTransition(async () => {
      await sendMessage(activeConvId, textToSend);
      await loadMessages(activeConvId);
      const updatedConvs = await getUserConversations();
      setConversations(updatedConvs);
    });
  };

  return (
    <div className="h-[calc(100vh-8rem)] rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden flex flex-col md:flex-row">
      {/* Left Sidebar: Conversations List */}
      <div className={`w-full md:w-80 border-r border-slate-200 bg-slate-50 flex flex-col ${activeConvId ? "hidden md:flex" : "flex"}`}>
        {/* Header & Search */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <ChatIcon className="h-5 w-5 text-brand-600" /> Chat Room
            </h2>
            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
              {conversations.length}
            </span>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 focus:bg-white focus:border-brand-500"
            />
          </div>
        </div>

        {/* Conversations Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found.
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              const name = conv.otherUser.name ?? conv.otherUser.email;
              const role = conv.otherUser.role;

              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full p-4 text-left flex items-start gap-3 transition ${
                    isActive
                      ? "bg-brand-50/80 border-l-4 border-brand-600"
                      : "hover:bg-white"
                  }`}
                >
                  {conv.otherUser.image ? (
                    <img
                      src={conv.otherUser.image}
                      alt={name}
                      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 font-bold text-white text-sm">
                      {name[0]?.toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <p className="truncate text-xs font-bold text-slate-900">{name}</p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {new Date(conv.lastMessageTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="rounded bg-slate-200/70 px-1.5 py-0.2 text-[9px] font-bold text-slate-600 uppercase">
                        {role}
                      </span>
                      <p className="truncate text-xs text-slate-500">
                        {conv.isLastMessageMine ? "You: " : ""}
                        {conv.lastMessage}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Window */}
      <div className={`flex-1 flex flex-col bg-slate-50/50 ${!activeConvId ? "hidden md:flex" : "flex"}`}>
        {activeConvId && activePartner ? (
          <>
            {/* Chat Thread Header */}
            <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveConvId(null)}
                  className="md:hidden text-xs font-bold text-slate-500 hover:text-slate-900 mr-1"
                >
                  ← Back
                </button>

                {activePartner.image ? (
                  <img
                    src={activePartner.image}
                    alt={activePartner.name ?? "User"}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 font-bold text-white text-sm">
                    {activePartner.name?.[0]?.toUpperCase() ?? "U"}
                  </div>
                )}

                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-slate-900">
                      {activePartner.name ?? "User"}
                    </h3>
                    <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 uppercase">
                      {activePartner.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Active in Chat
                  </p>
                </div>
              </div>
            </div>

            {/* Messages Container */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No messages yet. Send a message to start the conversation!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.senderId === currentUserId;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div
                        className={`max-w-xs md:max-w-md rounded-2xl px-4 py-2.5 text-xs shadow-sm ${
                          isMine
                            ? "bg-brand-600 text-white rounded-br-none"
                            : "bg-white border border-slate-200 text-slate-900 rounded-bl-none"
                        }`}
                      >
                        <p className="leading-relaxed whitespace-pre-line">{msg.text}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 px-1 mt-1">
                        {new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              />
              <button
                type="submit"
                disabled={isPending || !messageText.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-brand-600 p-2.5 text-white transition hover:bg-brand-700 disabled:opacity-40"
              >
                <SendIcon className="h-4 w-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <ChatIcon className="h-12 w-12 text-slate-300" />
            <h3 className="mt-3 text-sm font-bold text-slate-700">Select a Conversation</h3>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              Choose a chat thread from the left menu or click "Chat with Tutor" on any profile card.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
