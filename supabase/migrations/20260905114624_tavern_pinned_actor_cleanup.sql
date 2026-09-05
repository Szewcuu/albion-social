alter table public.chat_messages
  drop constraint if exists chat_messages_pinned_state_check;

alter table public.chat_messages
  add constraint chat_messages_pinned_state_check check (
    (is_pinned = false and pinned_at is null and pinned_by is null)
    or (is_pinned = true and pinned_at is not null)
  );
