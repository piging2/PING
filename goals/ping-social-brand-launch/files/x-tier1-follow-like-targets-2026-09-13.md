# X Tier 1 follow/like targets and interaction policy (2026-09-13)

Nolan's directive, received 2026-09-13 ~17:10 MDT. This supersedes "PING discovers, Nolan decides" for follows and likes ONLY: Nolan explicitly authorized follows and likes via the X API. Comments remain off the table (too expensive). All writes were previously paused; this document records the explicit authorization.

## Interaction policy (locked)
- READS: free via headed browser (Pig), never burn API credits on reads.
- WRITES: official X API only, never browser automation. Follows and likes only. NO comments (expensive, and voice risk).
- Authorization: Nolan explicitly authorized follows and likes on 2026-09-13 ("just go follow and like all the people surrounding [Tier 1]"). Start with ONE follow as a connectivity test, verify it works, then ramp slowly and carefully.
- Ramp: intelligent and slow. X suspends aggressive follow behavior. One test, then a handful per day maximum, human pacing.

## Tier 1, the absolute core (monitor daily)
Elon Musk (xAI, SpaceX, Tesla, X, engineering, AI), Jensen Huang (AI infra, GPUs), Sam Altman (frontier AI, startups, product), Dario Amodei (frontier AI, agents, safety), Demis Hassabis (AI research), Mark Zuckerberg (open AI, infra, consumer AI), Satya Nadella (enterprise AI/cloud), Sundar Pichai (AI/search/cloud), Lisa Su (compute/semiconductors), Alexandr Wang (AI infra/data), Clem Delangue (open-source AI), Andrej Karpathy (AI engineering/education), Yann LeCun (AI research/open source), Andrew Ng (practical AI), Lex Fridman (tech/founders/AI), Paul Graham (startups/founders), Brian Chesky (founder/product culture), Jeff Bezos (infrastructure/business/space), Peter Thiel (startups/tech/investing).

Current note: Musk, Altman, Amodei, Hassabis publicly aligned around AI-development/safety questions this week.

## Operating principle: build a Technology Influence Graph, not a celebrity list
PING should understand topic structure (Models / Compute / Agents -> Developer Tools -> Open Source -> Startups -> PING) and identify who matters to the PING thesis, not who has the most followers.

## 12 territories to own
1. AI / Frontier Models (frontier models, reasoning, agents, inference, multimodal, training, synthetic data, AI safety, scaling, open models)
2. AI Engineering (agents, orchestration, context engineering, RAG, MCP, tool use, memory, evals, inference, routing, model serving) — OmniRoute/HumanLayer/Temporal thinking belongs here
3. Open Source AI (Hugging Face, Ollama, vLLM, llama.cpp, Qdrant, Neo4j, PostgreSQL, Kubernetes, Nix, Linux, Rust, Zig) — potential PING distribution channel
4. Developer Infrastructure (GitHub, Cloudflare, Vercel, Supabase, Neon, Fly.io, Railway, Render, Docker, Kubernetes, Temporal, NATS)
5. Software Architecture (deterministic systems, distributed systems, event sourcing, immutable infrastructure, reproducibility, dependency graphs, provenance, databases, compilers, operating systems) — the Continuity Kernel conversation
6. Robotics (humanoids, autonomous systems, computer vision, robotics software, simulation, physical AI)
7. Space (SpaceX, Starship, launch, satellite networks, propulsion, aerospace engineering)
8. Energy (batteries, nuclear, solar, grid infrastructure, energy storage, data-center power)
9. Founder / Startup X (founder mode, YC, product-market fit, bootstrapping, venture, SaaS, developer startups, open-source businesses, distribution) — participate, not just observe
10. Creator / Tech Media (tech YouTubers, AI educators, podcasts, newsletters, developer advocates, technical writers, conference speakers)
11. Local Business / SMB Technology (AI + Local SEO + GEO + Small Business + Influencers + Automation — few own this intersection)
12. AI Search / GEO (Google AI Overviews, Gemini, ChatGPT search, Perplexity, Claude, local search, entity recognition, citations, knowledge graphs, reviews, reputation, structured data) — signature PING territory

## Below the celebrity layer (may matter MORE)
AI builders: Andrej Karpathy, Jeremy Howard, Simon Willison, Ethan Mollick, Harrison Chase, Jerry Liu, Hamel Husain, Chip Huyen, Sebastian Raschka, Francois Chollet, Nathan Lambert, Jim Fan, Lilian Weng.
Open-source/infra: Mitchell Hashimoto, Kelsey Hightower, Solomon Hykes, Salvatore Sanfilippo, Armin Ronacher, Theo Browne, Guillermo Rauch, Guillermo Morales, DHH, TJ Holowaychuk.
Developer/technical creators: Fireship, Theo, Primeagen, NetworkChuck, Traversy Media, Lex Fridman, Marques Brownlee, Matt Wolfe, Wes Roth. All-In ecosystem.

## Elon-adjacent graph (not "people Elon follows")
Direct (work with Musk companies), Technical (same engineering problems), Intellectual (ideas intersect Musk's tech interests), Entrepreneurial (adjacent-market founders), Distribution (creators covering Musk/xAI/SpaceX/Tesla/AI), Opposition (strong disagree-ers — disagreement creates conversation).

## The most important rule
Don't make PING a Musk fan account. Make it a technology intelligence account in the same technical ecosystem. On any claim: Claim -> Evidence -> Related research -> Contradictory evidence -> Industry reaction -> PING's analysis.

## Expansion order (Nolan's directive)
1. Test: follow ONE Tier 1-surrounding account, verify it works.
2. Follow and like people surrounding Tier 1.
3. Move on to the biggest tech podcasters/YouTubers.
4. Follows and likes over comments, always.

## Auth
OAuth 2.0 user-context via Secure Vault connector (custom.x) is the only auth architecture. Requested scopes: tweet.read, users.read, follows.read, follows.write, like.read, like.write, offline.access. Bearer paste retired in favor of OAuth. Client credentials Nolan supplied used transiently for flow setup only, never stored.
