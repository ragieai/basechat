"use server";

import assert from "assert";
import { Readable } from "stream";

import * as Minio from "minio";
import { z } from "zod";

import { deleteTenantLogo, setTenantLogo } from "@/lib/server/service";
import { requireAuthContext } from "@/lib/server/utils";

export type CreateLogoState =
  | {
      status: "pending";
    }
  | {
      status: "success";
      url: string;
      fileName: string;
    }
  | {
      status: "error";
      message: string;
    };

function createMinioClient(): Minio.Client {
  assert(process.env.STORAGE_ENDPOINT);
  assert(process.env.STORAGE_USE_SSL);
  assert(process.env.STORAGE_ACCESS_KEY);
  assert(process.env.STORAGE_SECRET_KEY);

  const options: Minio.ClientOptions = {
    endPoint: process.env.STORAGE_ENDPOINT,
    useSSL: process.env.STORAGE_USE_SSL.toLowerCase() === "true" ? true : false,
    accessKey: process.env.STORAGE_ACCESS_KEY,
    secretKey: process.env.STORAGE_SECRET_KEY,
  };

  if (process.env.STORAGE_PORT) {
    options.port = parseInt(process.env.STORAGE_PORT);
  }
  if (process.env.STORAGE_REGION) {
    options.region = process.env.STORAGE_REGION;
  }

  return new Minio.Client(options);
}

function getGCSObjectUrl(objectName: string): string {
  assert(process.env.STORAGE_USE_SSL);
  assert(process.env.STORAGE_BUCKET);

  const useSSL = process.env.STORAGE_USE_SSL;
  const protocol = useSSL ? "https" : "http";
  const bucket = process.env.STORAGE_BUCKET;

  const encodedObjectName = encodeURIComponent(objectName);
  let base = `${protocol}://www.googleapis.com`;
  if (process.env.STORAGE_PORT) {
    base += ":" + process.env.STORAGE_PORT;
  }

  return `${base}/download/storage/v1/b/${bucket}/o/${encodedObjectName}?alt=media`;
}

function getS3ObjectUrl(objectName: string): string {
  assert(process.env.STORAGE_USE_SSL);
  assert(process.env.STORAGE_BUCKET);
  assert(process.env.STORAGE_REGION);

  const useSSL = process.env.STORAGE_USE_SSL;
  const protocol = useSSL ? "https" : "http";
  const bucket = process.env.STORAGE_BUCKET;
  const region = process.env.STORAGE_REGION;

  const encodedObjectName = encodeURIComponent(objectName);
  let base = `${protocol}://${bucket}.s3.${region}.amazonaws.com`;
  if (process.env.STORAGE_PORT) {
    base += ":" + process.env.STORAGE_PORT;
  }

  return `${base}/${encodedObjectName}`;
}

function getObjectUrl(objectName: string): string {
  assert(process.env.STORAGE_ENDPOINT);

  const endpoint = process.env.STORAGE_ENDPOINT;

  switch (endpoint) {
    case "storage.googleapis.com":
      return getGCSObjectUrl(objectName);
    case "s3.amazonaws.com":
      return getS3ObjectUrl(objectName);
    default:
      throw new Error(`Endpoint ${endpoint} not supported`);
  }
}

function fileToReadable(file: File) {
  const readableStream = file.stream();
  const reader = readableStream.getReader();

  const readable = new Readable({
    read() {
      reader
        .read()
        .then(({ done, value }) => {
          if (done) {
            this.push(null);
          } else {
            this.push(Buffer.from(value));
          }
        })
        .catch((err) => {
          this.destroy(err);
        });
    },
  });

  return readable;
}

const createLogoSchema = z.object({
  slug: z.string(),
  file: z.instanceof(File),
});

export async function createLogo(prevState: CreateLogoState, formData: FormData): Promise<CreateLogoState> {
  const parsed = createLogoSchema.parse({
    slug: formData.get("slug"),
    file: formData.get("file"),
  });
  const { tenant } = await requireAuthContext(parsed.slug);

  assert(process.env.STORAGE_BUCKET);

  const prefix = process.env.STORAGE_PREFIX;
  const bucket = process.env.STORAGE_BUCKET;
  const minioClient = createMinioClient();

  // Delete the old logo if we have one
  if (tenant.logoObjectName) {
    try {
      await minioClient.statObject(bucket, tenant.logoObjectName);
      await minioClient.removeObject(bucket, tenant.logoObjectName);
    } catch (error: unknown) {
      // Do nothing.
    }
  }

  // Add the current timestamp to avoid issues with old logo name being cached in browser
  const nowTimestamp = new Date().getTime();
  const objectName = `logo_${nowTimestamp}.png`;

  try {
    const readable = fileToReadable(parsed.file);
    let uploadObjectName = `${tenant.id}/${objectName}`;
    if (prefix) {
      uploadObjectName = `${prefix}/${uploadObjectName}`;
    }

    await minioClient.putObject(bucket, uploadObjectName, readable);

    const objectUrl = getObjectUrl(uploadObjectName);
    await setTenantLogo(tenant.id, parsed.file.name, objectName, objectUrl);

    return {
      status: "success",
      url: objectUrl,
      fileName: parsed.file.name,
    };
  } catch (error: unknown) {
    console.log(error);
    return {
      status: "error",
      message: "An unexpected error occurred",
    };
  }
}

export type DeleteLogoState =
  | {
      status: "pending";
    }
  | {
      status: "success";
    }
  | {
      status: "error";
      message: string;
    };

const deleteLogoSchema = z.object({
  slug: z.string(),
});

export async function deleteLogo(prevState: DeleteLogoState, formData: FormData): Promise<DeleteLogoState> {
  const parsed = deleteLogoSchema.parse({
    slug: formData.get("slug"),
  });
  const { tenant } = await requireAuthContext(parsed.slug);

  const minioClient = createMinioClient();

  assert(process.env.STORAGE_BUCKET);
  const bucket = process.env.STORAGE_BUCKET;

  if (tenant.logoObjectName) {
    try {
      await minioClient.statObject(bucket, tenant.logoObjectName);
      await minioClient.removeObject(bucket, tenant.logoObjectName);
    } catch (error: unknown) {
      const notFoundError = error as { code: string };
      if (notFoundError.code !== "NotFound") {
        return {
          status: "error",
          message: "Unable to delete logo",
        };
      }
    } finally {
      try {
        await deleteTenantLogo(tenant.id);
      } catch (error: unknown) {
        // Do nothing. Should log it.
      }
    }
  }

  return {
    status: "success",
  };
}
