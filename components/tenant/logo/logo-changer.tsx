"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { ConfirmDeleteLogoDialog } from "./confirm-delete-dialog";
import CreateLogoDialog, { OnSuccessEvent } from "./create-logo-dialog";
import UploadableLogo, { FileCreateEvent, FileDeleteEvent } from "./uploadable-logo";

interface Props {
  name: string;
  logoName?: string | null;
  logoUrl?: string | null;
}

export default function LogoChanger({ logoName: initialLogoName, logoUrl: initialLogoUrl }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null | undefined>(initialLogoUrl);
  const [logoName, setLogoName] = useState<string | null | undefined>(initialLogoName);

  const onLogoChange = useCallback((event: FileCreateEvent | FileDeleteEvent) => {
    if (event.action === "create") {
      setImage(event.data);
      setLogoName(event.fileName);
      return;
    }

    if (event.action === "delete") {
      setConfirmDelete(true);
    }
  }, []);

  const onSetLogoCancel = () => setImage(null);
  const onSetLogoSuccess = ({ url, fileName }: OnSuccessEvent) => {
    toast.success("Logo updated");
    setLogoUrl(url);
    setLogoName(fileName);
    setImage(null);
  };

  const onDeleteLogoSuccess = () => {
    setConfirmDelete(false);
    setImage(null);
    setLogoUrl(null);
    toast.success("Logo successfully deleted");
  };

  return (
    <>
      <UploadableLogo imageUrl={logoUrl} imageName={logoName} onChange={onLogoChange} />
      {image && (
        <CreateLogoDialog image={image} imageName={logoName} onCancel={onSetLogoCancel} onSuccess={onSetLogoSuccess} />
      )}
      {confirmDelete && (
        <ConfirmDeleteLogoDialog onCancel={() => setConfirmDelete(false)} onSuccess={() => onDeleteLogoSuccess()} />
      )}
    </>
  );
}
