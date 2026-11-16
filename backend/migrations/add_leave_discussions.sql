-- Leave Discussion & System Activity Schema for Supabase PostgreSQL
CREATE TABLE IF NOT EXISTS public.leave_discussions (
  id SERIAL PRIMARY KEY,
  leave_request_id INTEGER NOT NULL REFERENCES public.leave_requests(leave_id) ON DELETE CASCADE,
  sender_id VARCHAR(100) NOT NULL,
  sender_role VARCHAR(100) NOT NULL,
  message_type VARCHAR(30) NOT NULL DEFAULT 'comment',
  message TEXT NOT NULL DEFAULT '',
  attachment_url TEXT,
  attachment_name VARCHAR(255),
  attachment_mime VARCHAR(150),
  attachment_size INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_leave_discussions_content
    CHECK (LENGTH(TRIM(COALESCE(message, ''))) > 0 OR attachment_url IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_leave_discussions_leave_created
  ON public.leave_discussions (leave_request_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_leave_discussions_sender
  ON public.leave_discussions (sender_id);

CREATE TABLE IF NOT EXISTS public.leave_discussion_reads (
  leave_request_id INTEGER NOT NULL REFERENCES public.leave_requests(leave_id) ON DELETE CASCADE,
  user_id VARCHAR(100) NOT NULL,
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (leave_request_id, user_id)
);

CREATE OR REPLACE FUNCTION public.set_leave_discussions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leave_discussions_updated_at ON public.leave_discussions;
CREATE TRIGGER trg_leave_discussions_updated_at
  BEFORE UPDATE ON public.leave_discussions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_leave_discussions_updated_at();

-- Backfill initial system activity for existing leave requests
INSERT INTO public.leave_discussions (
  leave_request_id, sender_id, sender_role, message_type, message, created_at, updated_at
)
SELECT
  lr.leave_id, 'system', 'system', 'system', 'Leave request submitted.', lr.created_at, lr.created_at
FROM public.leave_requests lr
WHERE NOT EXISTS (
  SELECT 1 FROM public.leave_discussions ld
  WHERE ld.leave_request_id = lr.leave_id
    AND ld.message_type = 'system'
    AND ld.message = 'Leave request submitted.'
);
