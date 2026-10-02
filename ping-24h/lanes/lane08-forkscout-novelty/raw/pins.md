# Lane 08 donor pins (verified from fresh shallow clones, 2026-09-28)

## ForkScout
- Repository: https://github.com/Forkscout/forkscout
- SHA: d72e5e6995e1015df1d0d28a698b6db4800478c5
- Commit date: 2026-03-16
- Version: 3.0.0 (package.json; "private": true)
- License: README claims MIT; NO LICENSE file observed at this pin. Badge links to a LICENSE that does not exist.
- Activity: head commit 2026-03-16 (stale relative to 2026-09-28)
- Language: TypeScript on Bun
- Architecture: single-process Bun agent; channels for Telegram, WhatsApp, Discord, Slack, LINE, Teams, terminal; ai-sdk LLM providers; MCP servers; tools directory; self-restart tooling.

## AgentOS (WAHIB-EL-KHADIRI)
- Repository: https://github.com/WAHIB-EL-KHADIRI/AgentOS
- SHA: 094d1eac251b0137c60d4a59db0ab2b07a87f754
- Commit date: 2026-09-23
- Version: 0.1.0 (Cargo.toml)
- License: Apache-2.0 (LICENSE file and Cargo.toml; open core, separate proprietary Enterprise edition per LICENSING.md)
- Activity: active; head 2026-09-23
- Language: Rust workspace (crates: kernel, llm, trace, vault, bus, cli, memory, plugins, registry, sdk) plus a dashboard
- Architecture: kernel with journal, supervisor, persistence; LLM provider abstraction; trace recorder; encrypted vault with permission sets.

## ShibaClaw
- Repository: https://github.com/RikyZ90/ShibaClaw
- SHA: 6e807c67635742c16c48ea83f9c0fc77af4d1d76
- Commit date: 2026-09-17
- Version: 1.0.1
- License: Apache-2.0 (LICENSE file present at this pin; note: v1.0.0 release notes claimed unlicensed state, resolved by this pin)
- Activity: active; v1.0.0 released 2026-09-08, v1.0.1 on 2026-09-17
- Language: Python
- Architecture: agent loop with per-iteration context, session permission modes, automation service with approve-once grants, masked credential requests.

## ORCH
- Repository: https://github.com/oxgeneral/ORCH
- SHA: c066dc013e98e08d753ce204e604e04621dd4167
- Commit date: 2026-08-01
- Version: v1.0.34 (release tag at head)
- License: MIT (LICENSE file present)
- Activity: head 2026-08-01
- Language: TypeScript (strict)
- Architecture: CLI orchestrator for teams of coding agents (Claude Code, Codex, Cursor adapters); task state machine todo -> in_progress -> review -> done with auto-retry; scope locking; inter-agent messaging; YAML/JSON stores, no database.
