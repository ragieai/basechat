export const getTenantPath = (slug: string) => `/${slug}`;

export const getConversationPath = (slug: string, id: string) => `${getTenantPath(slug)}/conversations/${id}`;

export const getDataPath = (slug: string) => `${getTenantPath(slug)}/data`;

export const getSettingsPath = (slug: string) => `${getTenantPath(slug)}/settings`;

export const getUserSettingsPath = (slug: string) => `${getSettingsPath(slug)}/users`;
