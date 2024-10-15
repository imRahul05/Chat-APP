-- Update the messages table to include a foreign key reference to auth.users
ALTER TABLE public.messages
ADD CONSTRAINT messages_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users(id)
ON DELETE CASCADE;

-- Create a view to join messages with user emails
CREATE OR REPLACE VIEW public.messages_with_users AS
SELECT 
    m.id,
    m.user_id,
    m.content,
    m.created_at,
    u.email as user_email
FROM 
    public.messages m
JOIN 
    auth.users u ON m.user_id = u.id;

-- Update the RLS policy to use the new view
DROP POLICY IF EXISTS "Authenticated users can read all messages" ON public.messages;

CREATE POLICY "Authenticated users can read all messages" ON public.messages_with_users
    FOR SELECT TO authenticated
    USING (true);

-- Grant necessary permissions
GRANT SELECT ON public.messages_with_users TO authenticated;