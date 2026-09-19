-- The Auth trigger calls this function internally. It must not be callable through PostgREST.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
