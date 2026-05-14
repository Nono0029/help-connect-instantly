insert into storage.buckets (id, name, public) values ('chat-photos', 'chat-photos', true) on conflict (id) do nothing;
