export const getTenantPath = (slug: string) => `/o/${slug}`;

export const getConversationPath = (slug: string, id: string) => `${getTenantPath(slug)}/conversations/${id}`;

export const getDataPath = (slug: string) => `${getTenantPath(slug)}/data`;

export const getSettingsPath = (slug: string) => `${getTenantPath(slug)}/settings`;

export const getUserSettingsPath = (slug: string) => `${getSettingsPath(slug)}/users`;

export const getCheckPath = (slug: string) => `/check/${slug}`;

export const getSignInPath = () => `/sign-in`;

export const getSignUpPath = () => `/sign-up`;

export const getSetupPath = () => `/setup`;

export const getStartPath = () => `/start`;
