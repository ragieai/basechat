CREATE TYPE share_access_type AS ENUM ('public', 'organization', 'email');

CREATE TABLE shared_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    share_id TEXT NOT NULL UNIQUE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    access_type share_access_type NOT NULL DEFAULT 'public',
    recipient_emails JSONB NOT NULL DEFAULT '[]',
    expires_at TIMESTAMP,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX shared_conversations_share_id_idx ON shared_conversations(share_id);
CREATE INDEX shared_conversations_conversation_id_idx ON shared_conversations(conversation_id);
CREATE INDEX shared_conversations_tenant_id_idx ON shared_conversations(tenant_id);