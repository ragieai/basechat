"use client";

import { formatDistanceToNow } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2, ChevronDown } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import Dropzone from "react-dropzone";
import { toast } from "sonner";

import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import CONNECTOR_MAP from "@/lib/connector-map";
import { MAX_FILE_SIZE, getDropzoneAcceptConfig, uploadFile, validateFile } from "@/lib/file-utils";
import { getStatusDisplayName } from "@/lib/utils";

import ManageFileMenu from "./manage-file-menu";

interface Props {
  tenant: {
    id: string;
    slug: string;
  };
  initialFiles: any[];
  nextCursor: string | null;
  userName: string | null;
}

interface TableControlsProps {
  totalFiles: number;
  currentPage: number;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

function TableControls({ totalFiles, currentPage, hasNextPage, onPreviousPage, onNextPage }: TableControlsProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
              Connector <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="connector-1" />
                <label htmlFor="connector-1" className="text-sm">
                  Option 1
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="connector-2" />
                <label htmlFor="connector-2" className="text-sm">
                  Option 2
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="connector-3" />
                <label htmlFor="connector-3" className="text-sm">
                  Option 3
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
              Type <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="type-1" />
                <label htmlFor="type-1" className="text-sm">
                  Option 1
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="type-2" />
                <label htmlFor="type-2" className="text-sm">
                  Option 2
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="type-3" />
                <label htmlFor="type-3" className="text-sm">
                  Option 3
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50">
              Status <ChevronDown className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-48">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="status-1" />
                <label htmlFor="status-1" className="text-sm">
                  Option 1
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="status-2" />
                <label htmlFor="status-2" className="text-sm">
                  Option 2
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="status-3" />
                <label htmlFor="status-3" className="text-sm">
                  Option 3
                </label>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onPreviousPage}
          disabled={currentPage === 1}
          className={`p-1 rounded-md ${currentPage === 1 ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onNextPage}
          disabled={!hasNextPage}
          className={`p-1 rounded-md ${
            !hasNextPage ? "text-gray-400 cursor-not-allowed" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export default function FilesTable({ tenant, initialFiles, nextCursor, userName }: Props) {
  const router = useRouter();
  const [allFiles, setAllFiles] = useState(initialFiles);
  const [currentNextCursor, setCurrentNextCursor] = useState<string | null>(nextCursor);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const ITEMS_PER_PAGE = 12;
  const [isDragActive, setIsDragActive] = useState(false);

  // update the table if a file has been deleted
  const handleFileRemoved = (fileId: string) => {
    setAllFiles((prev) => {
      const index = prev.findIndex((file) => file.id === fileId);
      if (index === -1) return prev; // File not found
      const newFiles = [...prev];
      newFiles.splice(index, 1);
      return newFiles;
    });
  };

  const loadNextPage = async () => {
    if (!currentNextCursor || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/tenants/current/documents?cursor=${currentNextCursor}`, {
        headers: { tenant: tenant.slug },
      });
      const data = await response.json();

      if (data.documents) {
        setAllFiles((prev) => [...prev, ...data.documents]);
        setCurrentNextCursor(data.nextCursor);
      }
    } catch (error) {
      console.error("Error loading more files:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const goToNextPage = async () => {
    // If we're on the last page and have a next cursor, load more files
    if (currentPage * ITEMS_PER_PAGE >= allFiles.length && currentNextCursor) {
      await loadNextPage();
    }
    setCurrentPage((prev) => prev + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Calculate the current page's files
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentFiles = allFiles.slice(startIndex, endIndex);

  useEffect(() => {
    const checkFilesStatus = async () => {
      try {
        const response = await fetch("/api/tenants/current/documents", {
          headers: { tenant: tenant.slug },
        });
        const data = await response.json();

        if (data.documents) {
          // Only update the status of existing files
          setAllFiles((prev) =>
            prev.map((file) => {
              const updatedFile = data.documents.find((d: any) => d.id === file.id);
              return updatedFile || file;
            }),
          );

          // Check if any files are still processing
          const hasProcessingFiles = data.documents.some(
            (file: any) => file.status !== "ready" && file.status !== "failed",
          );

          // If no more processing files, clear the interval
          if (!hasProcessingFiles && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch (error) {
        console.error("Error fetching documents:", error);
      }
    };

    // Initial check for processing files
    const hasProcessingFiles = initialFiles.some((file) => file.status !== "ready" && file.status !== "failed");

    // Set up polling if needed
    if (hasProcessingFiles) {
      intervalRef.current = setInterval(checkFilesStatus, 5000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [initialFiles, tenant.slug]);

  return (
    <Dropzone
      onDrop={async (acceptedFiles: File[]) => {
        const uploadPromises = acceptedFiles.map(async (file) => {
          const validation = validateFile(file);
          if (!validation.isValid) {
            toast.error(validation.error);
            return;
          }
          const toastId = toast.loading(`Uploading ${file.name}...`);

          try {
            await uploadFile(file, tenant.slug, userName);
            toast.success(`Successfully uploaded ${file.name}`, {
              id: toastId,
            });
            router.refresh();
          } catch (err) {
            toast.error(`Failed to upload ${file.name}`, {
              id: toastId,
            });
          }
        });

        await Promise.all(uploadPromises);
      }}
      accept={getDropzoneAcceptConfig()}
      maxSize={MAX_FILE_SIZE}
      onDragEnter={() => setIsDragActive(true)}
      onDragLeave={() => setIsDragActive(false)}
      onDropAccepted={() => setIsDragActive(false)}
      onDropRejected={() => setIsDragActive(false)}
      noClick
    >
      {({ getRootProps, getInputProps }) => (
        <div className="h-full w-full flex flex-col" {...getRootProps()}>
          <input {...getInputProps()} />
          <hr className="my-4" />
          <TableControls
            totalFiles={allFiles.length}
            currentPage={currentPage}
            hasNextPage={!!currentNextCursor || currentPage * ITEMS_PER_PAGE < allFiles.length}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
          <div
            className={`flex-1 overflow-y-auto relative ${isDragActive ? "after:content-[''] after:absolute after:inset-0 after:bg-[#F0F7FF] after:border-2 after:border-[#007AFF] after:border-dashed after:rounded-lg after:pointer-events-none" : ""}`}
          >
            {isLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#006EDB]" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[600px]">Name</TableHead>
                    <TableHead className="w-[200px]">Connection</TableHead>
                    <TableHead className="w-[200px]">Added by</TableHead>
                    <TableHead className="w-[200px]">Date added</TableHead>
                    <TableHead className="w-[200px]">Date modified</TableHead>
                    <TableHead className="w-[100px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell className="font-medium flex items-center">
                        <div>{file.name}</div>
                      </TableCell>
                      <TableCell>
                        {file.metadata?.source_type && file.metadata.source_type !== "manual" ? (
                          <div className="flex items-center gap-2">
                            <Image
                              src={CONNECTOR_MAP[file.metadata.source_type][1]}
                              alt={CONNECTOR_MAP[file.metadata.source_type][0]}
                              className="mr-1"
                            />
                            {CONNECTOR_MAP[file.metadata.source_type][0]}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {file.metadata?.source_type && file.metadata.source_type !== "manual" ? (
                          <div className="flex items-center gap-2">
                            <Image
                              src={CONNECTOR_MAP[file.metadata.source_type][1]}
                              alt={CONNECTOR_MAP[file.metadata.source_type][0]}
                              className="mr-1"
                            />
                            {CONNECTOR_MAP[file.metadata.source_type][0]}
                          </div>
                        ) : (
                          file.metadata.added_by || "-"
                        )}
                      </TableCell>
                      {/* TODO: get added by from metadata */}
                      <TableCell>{formatDistanceToNow(new Date(file.createdAt), { addSuffix: true })}</TableCell>
                      <TableCell>{formatDistanceToNow(new Date(file.updatedAt), { addSuffix: true })}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {file.status !== "ready" && file.status !== "failed" && (
                            <Loader2 className="h-4 w-4 animate-spin text-[#006EDB]" />
                          )}
                          {getStatusDisplayName(file.status)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ManageFileMenu
                          id={file.id}
                          tenant={tenant}
                          isConnectorFile={file.metadata?.source_type && file.metadata.source_type !== "manual"}
                          onFileRemoved={handleFileRemoved}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      )}
    </Dropzone>
  );
}
