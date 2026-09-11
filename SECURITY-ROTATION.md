# Credential rotation — required

On 2026-09-11 MongoDB Atlas reported that live database credentials for this
project were public on GitHub. Investigation found the leak was wider than the
Atlas alert: `docker-compose.yml` and every service `.env.example` carried real
production secrets.

The code no longer contains secrets — they now come from a git-ignored `.env`.
**That change alone does not make you safe.** Anything that was public must be
rotated, because it is still valid and it remains in git history forever.

## Rotate these — all of them

| # | Secret | Where to rotate |
|---|--------|-----------------|
| 1 | Atlas DB user `madhawaawishka` | Atlas → Database Access → Edit password (use a generated one, not the username) |
| 2 | Atlas DB user `bhashanasirimanna` (cluster `mdp0gxg`) | Same; was exposed in the root `.env.example` |
| 3 | Gmail app password (`radalapuththu@gmail.com`) | Google Account → Security → App passwords → revoke + create new |
| 4 | Twilio auth token | Twilio Console → Account → API keys & tokens → rotate |
| 5 | Cloudinary API secret | Cloudinary → Settings → Security → regenerate |
| 6 | Stripe secret key + webhook signing secret | Stripe Dashboard → Developers → API keys → roll |
| 7 | `JWT_SECRET` | `openssl rand -base64 48` — the old value was the literal `your_super_secret_key` |

After each rotation, put the new value in `.env` (git-ignored) and restart:

    docker compose up -d --force-recreate

Note on #7: changing `JWT_SECRET` invalidates every issued token, so all users
are logged out on deploy. That is the intended outcome — the old secret was
public, meaning anyone could mint valid admin tokens.

## Also do

- **Atlas network access**: Project → Network Access. If it contains
  `0.0.0.0/0`, replace it with your actual server/dev IPs. A leaked password is
  only exploitable if the attacker can reach the cluster.
- **Check for abuse**: Atlas access history, Stripe payment logs, Twilio usage,
  and Gmail "recent security activity" — look for activity you don't recognise
  in the window the keys were public.

## Git history

The secrets are still readable in past commits. Rotation (above) is what
actually closes the hole. Purging history is optional and *rewrites every
commit hash*, which breaks clones for the whole EasyEats-DS team — coordinate
before doing it:

    git filter-repo --path docker-compose.yml --invert-paths   # or use BFG

## Keeping it clean

- Real values live only in `.env`. `.env.example` is a committed template and
  must never hold a real value.
- `docker-compose.yml` uses `${VAR:?message}`, so a missing variable fails the
  stack immediately instead of silently starting with a default.
