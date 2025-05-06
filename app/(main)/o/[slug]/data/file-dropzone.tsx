"use client";

import { useRouter } from "next/navigation";
import Dropzone from "react-dropzone";
import { toast } from "sonner";

import { MAX_FILE_SIZE, getDropzoneAcceptConfig, uploadFile, validateFile } from "@/lib/file-utils";

interface FileDropzoneProps {
  tenant: {
    slug: string;
  };
  userName: string | null;
}

export default function FileDropzone({ tenant, userName }: FileDropzoneProps) {
  const router = useRouter();

  return (
    <Dropzone
      onDrop={async (acceptedFiles: File[]) => {
        const uploadPromises = acceptedFiles.map(async (file) => {
          const validation = validateFile(file);
          if (!validation.isValid) {
            toast.error(validation.error);
            return;
          }
          // Show a persistent toast for the upload
          const toastId = toast.loading(`Uploading ${file.name}...`);

          try {
            await uploadFile(file, tenant.slug, userName);
            toast.success(`Successfully uploaded ${file.name}`, {
              id: toastId,
            });
            // Refresh the page to update the server component
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
    >
      {({ getRootProps, getInputProps, isDragActive }) => (
        <section className="w-full h-full flex items-center justify-center">
          <div
            {...getRootProps()}
            className={`w-full h-full flex items-center justify-center border border-dashed border-[#27272A] rounded-lg p-8 mt-8 bg-[#F5F5F7] ${isDragActive ? "border-[#007AFF] bg-[#F0F7FF]" : ""}`}
          >
            <input {...getInputProps()} />
            <p className="text-center text-[#1D1D1F] font-medium text-base">
              {isDragActive ? (
                "Drop files here..."
              ) : (
                <>
                  Drop anything here or <span className="underline cursor-pointer">upload a file</span>
                </>
              )}
            </p>
          </div>
        </section>
      )}
    </Dropzone>
  );
}
