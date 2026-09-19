-- Keep exactly one Auth -> canonical Yuniko profile provisioning trigger.
drop trigger if exists on_auth_user_created on auth.users;
