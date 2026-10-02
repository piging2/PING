# Copilot identity broker

Goal ID: goal_6ad262118294
Goal slug: copilot-identity-broker

## Description
Nolan ordered a Copilot identity pool so coding tasks route to whichever identity has usable credits. The broker skeleton is built and verified live on the Pig with fail-closed quota eligibility and no token material in state, and browser OAuth is now the primary authorization path with a fresh temporary Chrome profile per attempt so Nolan can choose a different GitHub identity each time. Two authorization attempts got through GitHub sign-in and Authorize but failed on the localhost callback; the failure was clarified as ERR_CONNECTION_REFUSED on 127.0.0.1, shifting investigation to loopback connectivity while the Pig is unreachable.
