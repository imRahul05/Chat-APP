-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security on groups table
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to create groups
CREATE POLICY "Users can create groups" ON public.groups
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by);

-- Create policy to allow all authenticated users to read all groups
CREATE POLICY "Authenticated users can read all groups" ON public.groups
    FOR SELECT TO authenticated
    USING (true);

-- Add group_id column to messages table
ALTER TABLE public.messages
ADD COLUMN group_id BIGINT REFERENCES public.groups(id);

-- Update messages_with_users view to include group_id
CREATE OR REPLACE VIEW public.messages_with_users AS
SELECT 
    m.id,
    m.user_id,
    m.content,
    m.created_at,
    m.group_id,
    u.email as user_email
FROM 
    public.messages m
JOIN 
    auth.users u ON m.user_id = u.id;

-- Update the RLS policy for messages to include group_id
DROP POLICY IF EXISTS "Users can insert their own messages" ON public.messages;
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id AND group_id IS NOT NULL);

-- Grant necessary permissions
GRANT SELECT ON public.groups TO authenticated;
GRANT INSERT ON public.groups TO authenticated;
GRANT USAGE ON SEQUENCE public.groups_id_seq TO authenticated;