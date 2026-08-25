-- Enable realtime on notifications for live badge + sound

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when others then
    if sqlerrm not like '%already member%' then
      raise;
    end if;
end $$;
