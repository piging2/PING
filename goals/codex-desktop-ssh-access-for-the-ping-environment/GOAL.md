# Codex Desktop SSH access for the PING environment

Goal ID: goal_e8a3692e6b9a
Goal slug: codex-desktop-ssh-access-for-the-ping-environment

## Description
Nolan asked for ChatGPT Desktop Codex to get secure write access to the PING repositories on his Pig workstation (C:\Users\nolan\PING and /home/nolan/ping), which are currently readable but not writable. The work runs in phases: audit the current SSH state, repair only the broken OpenSSH configuration, then configure public-key-only authentication scoped to those paths. Strict constraints apply: no root login, no password auth, no public exposure, and every change reversible and auditable.
