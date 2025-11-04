"use client";

import { DropdownMenuTrigger } from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal, RefreshCw, Trash } from "lucide-react";
import { Inter } from "next/font/google";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";

const inter = Inter({ subsets: ["latin"] });

interface Props {
  id: string;
  tenant: {
    slug: string;
  };
  connectionStatus: string;
}

export default function ManageConnectionMenu({ id, tenant, connectionStatus }: Props) {
  const router = useRouter();
  const isSyncDisabled = connectionStatus !== "ready" && connectionStatus !== "failed";

  async function deleteConnection() {
    try {
      const res = await fetch(`/api/connections/${id}`, {
        headers: { tenant: tenant.slug },
        method: "DELETE",
      });

      if (!res.ok) throw new Error("delete failed");

      toast.success("Connection deleted successfully");
      router.refresh();
    } catch (error) {
      toast.error("Failed to delete connection");
    }
  }

  async function syncConnection() {
    try {
      const res = await fetch(`/api/connections/${id}/sync`, {
        headers: { tenant: tenant.slug },
        method: "POST",
      });

      if (!res.ok) {
        // For 4XX errors, try to extract the error detail message
        if (res.status >= 400 && res.status < 500) {
          try {
            const errorData = await res.json();
            const errorMessage = errorData.error || "Failed to sync connection";
            toast.error(errorMessage);
          } catch {
            toast.error("Failed to sync connection");
          }
        } else {
          toast.error("Failed to sync connection");
        }
        return;
      }

      toast.success("Connector sync scheduled");
      router.refresh();
    } catch (error) {
      toast.error("Failed to sync connection");
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button>
          <MoreHorizontal />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={inter.className}>
        <DropdownMenuItem
          onSelect={isSyncDisabled ? undefined : syncConnection}
          disabled={isSyncDisabled}
          className={isSyncDisabled ? "opacity-50 cursor-not-allowed" : ""}
        >
          <RefreshCw />
          Sync now
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={deleteConnection}>
          <Trash />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
