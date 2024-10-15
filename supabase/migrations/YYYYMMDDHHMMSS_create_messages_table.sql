-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to insert their own messages
CREATE POLICY "Users can insert their own messages" ON public.messages
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Create policy to allow all authenticated users to read all messages
CREATE POLICY "Authenticated users can read all messages" ON public.messages
    FOR SELECT TO authenticated
    USING (true);

-- Create index on user_id for better performance
CREATE INDEX IF NOT EXISTS messages_user_id_idx ON public.messages (user_id);