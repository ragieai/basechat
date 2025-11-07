export const getTenantPath = (slug: string) => `/o/${slug}`;

export const getConversationPath = (slug: string, id: string) => `${getTenantPath(slug)}/conversations/${id}`;

export const getDataPath = (slug: string) => `${getTenantPath(slug)}/data`;

export const getSettingsPath = (slug: string) => `${getTenantPath(slug)}/settings`;

export const getUserSettingsPath = (slug: string) => `${getSettingsPath(slug)}/users`;

export const getModelSettingsPath = (slug: string) => `${getSettingsPath(slug)}/models`;

export const getPromptSettingsPath = (slug: string) => `${getSettingsPath(slug)}/prompts`;

export const getSlackSettingsPath = (slug: string) => `${getSettingsPath(slug)}/slack`;

export const getBillingSettingsPath = (slug: string) => `${getSettingsPath(slug)}/billing`;

export const getCheckPath = (slug: string) => `/check/${slug}`;

export const getSignInPath = ({ reset }: { reset?: boolean } = {}) => `/sign-in${reset ? "?reset=true" : ""}`;

export const getSignUpPath = () => `/sign-up`;

export const getSetupPath = () => `/setup`;

export const getStartPath = () => `/start`;

export const getChangePasswordPath = () => `/change-password`;

export const getRagieStreamPath = (slug: string, streamUrl: string) => {
  const params = new URLSearchParams({ url: streamUrl, tenant: slug });

  return `/api/ragie/stream?${params.toString()}`;
};

export const getRagieSourcePath = (slug: string, documentId: string, page?: number) => {
  const params = new URLSearchParams({ tenant: slug });

  const baseUrl = `/api/ragie/documents/${documentId}/source?${params.toString()}`;

  if (page) {
    return `${baseUrl}#page=${page}`;
  }
  return baseUrl;
};

export const getPricingPlanChangePath = (slug: string) => `/pricing/${slug}/plan-change`;

export const getPricingPlansPath = (slug: string) => `/pricing/${slug}/plans`;

export const getRagieAgentsSearchPath = () => `/api/ragie/responses`;
