# Option 1: Home-laptop browser (the future-proof Facebook/Instagram setup)

Nolan's call 2026-09-10: after the 24h Instagram focus, run the browser from an old laptop at his house on his home internet instead of the cloud browser.

## Why this fixes it
- Facebook sees: residential home IP (stable), real Windows/Mac fingerprint, normal WebGL/canvas, persistent cookies. It looks exactly like Nolan on his couch.
- The cloud browser can never do this: datacenter IP (confirmed rotating), Linux UA, WebGL disabled, canvas spoofing detected.

## What the laptop needs
- Old laptop, plugged in 24/7, lid set to never sleep, connected to home WiFi.
- A dedicated Chrome profile logged into Facebook/Instagram once (by Nolan), kept logged in.
- A way for the cloud VM to reach the laptop securely.

## Setup path (simplest version)
1. Nolan installs Tailscale (free for personal use) on the old laptop and creates his private network (tailnet).
2. Nolan tells the agent the laptop is ready. The agent runs `tailscale up` on the cloud VM, which prints a one-time approval link; Nolan opens that link on his phone and taps approve. The VM joins his tailnet. No keys or secrets ever change hands.
3. Nolan double-clicks the starter file for his laptop (`start-ping-chrome-windows.bat` or `start-ping-chrome-mac.command` in the Library), which opens a dedicated Chrome profile with remote debugging on, then logs into Facebook and Instagram once by hand in that window.
4. From then on, engagement passes drive that Chrome over the tailnet. Sessions persist for weeks because the cookies, IP, and fingerprint never change.
5. When the driver is tested and working, the agent writes `~/workspace/outreach/laptop-browser-live.md` as the marker that the laptop path is operational.

## Notes
- Keep the dedicated profile separate from Nolan's daily browsing so his own Facebook use never disturbs the automation session.
- If the laptop reboots, Chrome needs relaunching (can be set to auto-start).
- This same laptop can run Instagram engagement too, same fingerprint benefits.
- Fallback if Tailscale is a hassle: an SSH reverse tunnel from the laptop to the VM (laptop initiates, so no home router changes needed).
