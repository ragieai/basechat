import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod/v3";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { conversationListResponseSchema, conversationSchema } from "@/lib/api";
import { getConversationPath, getTenantPath } from "@/lib/paths";
import { cn } from "@/lib/utils";
import EllipsesIcon from "@/public/icons/ellipses.svg";
import NewChatIcon from "@/public/icons/new-chat.svg";

interface Props {
  className?: string;
  tenant: { slug: string };
}

type Conversation = z.infer<typeof conversationSchema>;

type ConversationsByDate = {
  today: Conversation[];
  thisMonth: Conversation[];
  byMonth: Record<string, Conversation[]>;
  byYear: Record<string, Conversation[]>;
};

const ConversationPopoverContent = ({ children }: { children: React.ReactNode }) => (
  <PopoverContent
    align="end"
    alignOffset={-46}
    side="right"
    sideOffset={-16}
    className={cn("bg-[#F5F5F7] w-[100px] border border-[#D7D7D7] shadow-none rounded-[6px] p-3")}
  >
    {children}
  </PopoverContent>
);

const useConversations = (tenantSlug: string) => {
  return useInfiniteQuery({
    queryKey: ["conversations", tenantSlug],
    queryFn: async ({ pageParam = 1 }) => {
      const url = new URL("/api/conversations", window.location.origin);
      url.searchParams.set("page", pageParam.toString());
      url.searchParams.set("limit", "20");

      const res = await fetch(url.toString(), { headers: { tenant: tenantSlug } });
      const json = await res.json();
      return json;
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });
};

export default function ConversationHistory({ className, tenant }: Props) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, isError } = useConversations(tenant.slug);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 1.0 },
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleDelete = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          tenant: tenant.slug,
        },
        body: JSON.stringify({ tenantSlug: tenant.slug }),
      });

      if (!res.ok) {
        throw new Error("Failed to delete conversation");
      }

      toast.success("Conversation deleted");
      setOpenPopoverId(null);

      // Invalidate the conversations query to trigger a refetch
      await queryClient.invalidateQueries({ queryKey: ["conversations", tenant.slug] });

      // Check if we're currently viewing the deleted conversation
      const currentPath = location.pathname;
      const deletedConversationPath = getConversationPath(tenant.slug, conversationId);
      if (currentPath === deletedConversationPath) {
        router.push(getTenantPath(tenant.slug));
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
      toast.error("Failed to delete conversation");
    }
  };

  // Flatten all conversations from all pages
  const allConversations = data?.pages.flatMap((page) => page.items) || [];

  // Group conversations by date
  const groupedConversations = allConversations.reduce<ConversationsByDate>(
    (acc, conversation) => {
      const updatedAt = new Date(conversation.updatedAt);
      const now = new Date();

      // Check if conversation is from today
      if (
        updatedAt.getDate() === now.getDate() &&
        updatedAt.getMonth() === now.getMonth() &&
        updatedAt.getFullYear() === now.getFullYear()
      ) {
        acc.today.push(conversation);
        return acc;
      }

      // Check if conversation is from this month
      if (updatedAt.getMonth() === now.getMonth() && updatedAt.getFullYear() === now.getFullYear()) {
        acc.thisMonth.push(conversation);
        return acc;
      }

      // If conversation is from current year, group by month
      if (updatedAt.getFullYear() === now.getFullYear()) {
        const monthYear = updatedAt.toLocaleString("default", { month: "long", year: "numeric" });
        if (!acc.byMonth[monthYear]) {
          acc.byMonth[monthYear] = [];
        }
        acc.byMonth[monthYear].push(conversation);
        return acc;
      }

      // For previous years, group by year only
      const year = updatedAt.getFullYear().toString();
      if (!acc.byYear[year]) {
        acc.byYear[year] = [];
      }
      acc.byYear[year].push(conversation);
      return acc;
    },
    { today: [], thisMonth: [], byMonth: {}, byYear: {} },
  );

  return (
    <div className={`flex flex-col h-full ${className}`}>
      <Link href={getTenantPath(tenant.slug)}>
        <div className="flex items-center pl-2">
          <Image src={NewChatIcon} height={24} width={24} alt="New chat" />
          <div className="ml-1.5 font-medium">New Chat</div>
        </div>
      </Link>

      <div className="flex-1 mt-6">
        <div className="max-h-[calc(100vh-270px)] overflow-y-auto overflow-x-visible pr-1 scrollbar-thin">
          {isLoading ? (
            <div className="flex justify-center items-center mt-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isError ? (
            <div className="mt-4 text-gray-500 pl-3">Failed to load conversations.</div>
          ) : allConversations.length === 0 ? (
            <div className="mt-4 text-gray-500 pl-3">No chat history yet.</div>
          ) : (
            <div className="space-y-4">
              {/* Today's conversations */}
              {groupedConversations.today.length > 0 && (
                <div>
                  <div className="font-semibold text-[13px] mb-2 pl-3">Today</div>
                  <div className="space-y-2">
                    {groupedConversations.today.map((conversation, i) => (
                      <div
                        key={i}
                        className="py-2 flex justify-between items-center hover:bg-gray-200 rounded-md transition-colors group pr-2"
                      >
                        <Link href={getConversationPath(tenant.slug, conversation.id)} className="flex-1 min-w-0 pl-3">
                          <div className="truncate pr-2 max-w-[calc(100%-24px)] text-[14px] font-medium">
                            {conversation.title}
                          </div>
                        </Link>
                        <Popover
                          open={openPopoverId === conversation.id}
                          onOpenChange={(open) => setOpenPopoverId(open ? conversation.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Image
                              src={EllipsesIcon}
                              height={16}
                              width={16}
                              alt="Options"
                              className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </PopoverTrigger>
                          <ConversationPopoverContent>
                            <button
                              className="text-sm text-black hover:text-gray-700"
                              onClick={() => handleDelete(conversation.id)}
                            >
                              Delete
                            </button>
                          </ConversationPopoverContent>
                        </Popover>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* This month's conversations */}
              {groupedConversations.thisMonth.length > 0 && (
                <div>
                  <div className="font-semibold text-[13px] mb-2 pl-3">This month</div>
                  <div className="space-y-2">
                    {groupedConversations.thisMonth.map((conversation, i) => (
                      <div
                        key={i}
                        className="py-2 flex justify-between items-center hover:bg-gray-200 rounded-md transition-colors group pr-2"
                      >
                        <Link href={getConversationPath(tenant.slug, conversation.id)} className="flex-1 min-w-0 pl-3">
                          <div className="truncate pr-2 max-w-[calc(100%-24px)] text-[14px] font-medium">
                            {conversation.title}
                          </div>
                        </Link>
                        <Popover
                          open={openPopoverId === conversation.id}
                          onOpenChange={(open) => setOpenPopoverId(open ? conversation.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <Image
                              src={EllipsesIcon}
                              height={16}
                              width={16}
                              alt="Options"
                              className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                            />
                          </PopoverTrigger>
                          <ConversationPopoverContent>
                            <button
                              className="text-sm text-black hover:text-gray-700"
                              onClick={() => handleDelete(conversation.id)}
                            >
                              Delete
                            </button>
                          </ConversationPopoverContent>
                        </Popover>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Previous months */}
              {Object.entries(groupedConversations.byMonth).map(([month, monthConversations]) => {
                // Format month to have only first letter capitalized
                const formattedMonth =
                  month
                    .split(" ")[0] // Take only the month
                    .charAt(0)
                    .toUpperCase() + month.split(" ")[0].slice(1).toLowerCase();

                return (
                  <div key={month}>
                    <div className="font-semibold text-[13px] mb-2 pl-3">{formattedMonth}</div>
                    <div className="space-y-2">
                      {monthConversations.map((conversation, i) => (
                        <div
                          key={i}
                          className="py-2 flex justify-between items-center hover:bg-gray-200 rounded-md transition-colors group pr-2"
                        >
                          <Link
                            href={getConversationPath(tenant.slug, conversation.id)}
                            className="flex-1 min-w-0 pl-3"
                          >
                            <div className="truncate pr-2 max-w-[calc(100%-24px)] text-[14px] font-medium">
                              {conversation.title}
                            </div>
                          </Link>
                          <Popover
                            open={openPopoverId === conversation.id}
                            onOpenChange={(open) => setOpenPopoverId(open ? conversation.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Image
                                src={EllipsesIcon}
                                height={16}
                                width={16}
                                alt="Options"
                                className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </PopoverTrigger>
                            <ConversationPopoverContent>
                              <button
                                className="text-sm text-black hover:text-gray-700"
                                onClick={() => handleDelete(conversation.id)}
                              >
                                Delete
                              </button>
                            </ConversationPopoverContent>
                          </Popover>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {/* Previous years */}
              {Object.entries(groupedConversations.byYear)
                .sort(([yearA], [yearB]) => Number(yearB) - Number(yearA))
                .map(([year, yearConversations]) => (
                  <div key={year}>
                    <div className="font-semibold text-[13px] mb-2 pl-3">{year}</div>
                    <div className="space-y-2">
                      {yearConversations.map((conversation, i) => (
                        <div
                          key={i}
                          className="py-2 flex justify-between items-center hover:bg-gray-200 rounded-md transition-colors group pr-2"
                        >
                          <Link
                            href={getConversationPath(tenant.slug, conversation.id)}
                            className="flex-1 min-w-0 pl-3"
                          >
                            <div className="truncate pr-2 max-w-[calc(100%-24px)] text-[14px] font-medium">
                              {conversation.title}
                            </div>
                          </Link>
                          <Popover
                            open={openPopoverId === conversation.id}
                            onOpenChange={(open) => setOpenPopoverId(open ? conversation.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Image
                                src={EllipsesIcon}
                                height={16}
                                width={16}
                                alt="Options"
                                className="flex-shrink-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                              />
                            </PopoverTrigger>
                            <ConversationPopoverContent>
                              <button
                                className="text-sm text-black hover:text-gray-700"
                                onClick={() => handleDelete(conversation.id)}
                              >
                                Delete
                              </button>
                            </ConversationPopoverContent>
                          </Popover>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

              {/* Load more trigger */}
              <div ref={loadMoreRef}>
                {isFetchingNextPage && (
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
