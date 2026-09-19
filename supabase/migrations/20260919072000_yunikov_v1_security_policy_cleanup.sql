-- Remove legacy broad/public policies that duplicated the canonical authenticated policies.
drop policy if exists events_self_insert on yunikov_v1.events;
drop policy if exists events_self_read on yunikov_v1.events;
drop policy if exists likes_self on yunikov_v1.likes;
drop policy if exists login_events_self_read on yunikov_v1.login_events;
