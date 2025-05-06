"use client";

import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface Props {
  onSearch: (query: string) => void;
  value: string;
}

export default function FileSearch({ onSearch, value }: Props) {
  return (
    <div className="relative w-[300px]">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
      <Input
        type="text"
        placeholder="Search files..."
        className="pl-9 pr-9 focus-visible:ring-[#D946EF] focus-visible:ring-1 focus-visible:border-[#D946EF]"
        value={value}
        onChange={(e) => onSearch(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onSearch("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
