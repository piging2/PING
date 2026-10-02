# Copilot OAuth post-auth failure investigation

Goal ID: goal_9025c0222a63
Goal slug: copilot-oauth-post-auth-failure-investigation

## Description
Nolan's two fresh-session browser OAuth attempts both got GitHub's "What?" page AFTER completing the sign-in and Authorize steps. Lead hypothesis is a _gh_sess/CSRF token staleness at the post-auth boundary. When the Pig is reachable, inspect the failed-run logs and OAuth lifecycle, identify the exact request that triggers the failure, implement the smallest fix with a regression test, then live-test the full flow to identity ACTIVE with cleanup verified.
