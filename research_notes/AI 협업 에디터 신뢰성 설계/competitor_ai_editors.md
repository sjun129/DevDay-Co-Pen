# Competitor Analysis: How Collaborative Document Products Implement AI Editing (as of Sept 30, 2026)

Scope: Google Docs + Gemini, Microsoft Word/Copilot (Loop/Pages only partially), Notion AI/Agents, Tiptap AI Toolkit, Liveblocks AI agents, plus ChatGPT Canvas and Lex. Compared against Co-Pen's feature set: (a) AI as a named-cursor participant, (b) multiple role agents editing different parts in parallel while humans keep editing, (c) AI edits as tracked-change suggestions with accept/reject, (d) AI-only undo, (e) trust features: provenance of AI text, verification flags for risky facts, explanation cards, audit log.

Research method note: ~23 searches/fetches. Several primary pages (Microsoft Tech Community blog, Liveblocks showcase pages) did not render through the fetch tool, so some claims rest on search-result snippets or secondary news coverage; these are flagged "(snippet)" or "(secondary)".

## Q1. Is the AI a visible participant (cursor/presence) or a side panel / one-shot inserter?

### Takeaway
Among end-user products, AI is still a side panel / bottom bar / chat assistant, not a named cursor in the document (Google, Microsoft, Notion). The only place "AI as a presence/cursor participant" exists is at the infrastructure/SDK level (Liveblocks AI Presence APIs, and Tiptap streaming edits into collaborative docs), meaning developers can build it, but the big suites do not ship it as a user-facing concept.

### Cited Findings
- **Google Docs + Gemini**: Gemini is accessed via a "side panel or new pill-shaped bottom bar" with attachments/tools; features announced March 10, 2026 include Help me create, Help me write (refine sections), Match writing style, Match format — [9to5Google, Mar 10 2026](https://9to5google.com/2026/03/10/google-docs-gemini-upgrade/). Headline of that article frames it as "co-edit with Gemini", but the mechanics described are panel-driven, not a presence cursor — same source.
- **Google Docs + Gemini (comment workflows)**: Gemini summarizes comment threads, drafts replies, and proposes edits from reviewer feedback (e.g., "Rewrite the introduction to address Roberta's feedback"); rollout began July 28, 2026 — [Google Workspace Updates blog](https://workspaceupdates.googleblog.com/2026/07/streamline-collaboration-in-google-docs-with-Gemini-powered-comment-workflows.html); also covered as "Smart Review" — [Ubergizmo, Jul 2026](https://www.ubergizmo.com/2026/07/google-docs-smart-review-gemini-now-reads-replies-and-edits/) (secondary).
- **Microsoft Word + Copilot Agent Mode**: Agent Mode became the default Copilot experience in Word/Excel/PowerPoint; it "draft[s], rewrite[s], restructure[s], and reformat[s] your document in one go", working autonomously rather than suggesting steps — [Office Watch](https://office-watch.com/2026/copilot-agent-mode-word-excel-powerpoint/) (secondary). "For multi-step edits, Copilot now shows what it's working on in real time" — [The Decoder, Apr 15 2026](https://the-decoder.com/microsoft-copilot-in-word-can-now-track-changes-and-manage-comments/) (secondary). Interaction is still from the Copilot pane; no source describes a named Copilot cursor/presence avatar in the doc.
- **Microsoft Word (basic Copilot rewrite)**: Official support flow is select text -> Auto Rewrite/describe -> "Replace", "Insert below", or "Regenerate" — [Microsoft Support](https://support.microsoft.com/en-gb/office/agent-mode-in-word-647d5d14-eaec-4e8a-a574-7cefffa7f8f0). This is a one-shot inserter pattern.
- **Notion**: Notion 3.0 (Sept 18, 2025) rebuilt Notion AI as Agents that perform multi-step actions and create pages/databases directly — [Notion blog: Introducing Notion 3.0](https://www.notion.com/blog/introducing-notion-3-0); [Notion release Sept 18 2025](https://www.notion.com/releases/2025-09-18). Notion 3.7 (Sept 15, 2026) lets you "embed" agents "right where the work happens, so anyone on the page can use it" — [Notion release Sept 15 2026](https://www.notion.com/releases/2026-09-15). Embedding is an invocation point on the page, not a live cursor.
- **Liveblocks (SDK)**: Agent presence is set server-side via `POST /v2/rooms/{roomId}/presence` (or `liveblocks.setPresence` in @liveblocks/node) with a TTL, and "flows to all connected clients through the normal Liveblocks presence system, appearing in useOthers alongside real users"; presence can include cursor position — [Liveblocks: Get started with AI Presence](https://liveblocks.io/docs/get-started/nextjs-ai-presence) (snippet); [@liveblocks/yjs awareness](https://liveblocks.io/docs/api-reference/liveblocks-yjs) (snippet). The agentic-workflows guide shows presence that "highlights which input the agent is currently working on" — [Liveblocks guide](https://liveblocks.io/docs/guides/enabling-agentic-workflows-with-liveblocks). May 2026 update: "While the AI makes changes, its agent presence is displayed in the UI" — [What's new in Liveblocks: May 2026 (published Jun 4 2026)](https://liveblocks.io/blog/whats-new-in-liveblocks-may-2026).
- **Tiptap (SDK)**: AI Toolkit lets agents "read, understand, and edit the document in place, in real time"; "multiple users can see AI streaming and edits in real-time within collaborative documents" — [Tiptap AI Toolkit product page](https://tiptap.dev/product/ai-toolkit) (snippet). Originally pitched as "Cursor-like editing" for documents — [Tiptap: Announcing AI Toolkit](https://tiptap.dev/blog/release-notes/announcing-ai-toolkit). No source found for a built-in named AI cursor.
- **ChatGPT Canvas**: was a side-by-side editing space with ChatGPT and a "Show changes" diff button; OpenAI removed Canvas from GPT-5.5 on May 28, 2026, replacing it with "writing blocks" in chat responses — [ai-toolbox.co](https://www.ai-toolbox.co/chatgpt-management-and-productivity/how-to-use-chatgpt-canvas-guide-2026) (secondary); user backlash on [OpenAI Community forum](https://community.openai.com/t/please-restore-canvas-as-a-persistent-workspace-writing-blocks-are-not-an-equivalent-replacement/1398999); [AI Weekly](https://aiweekly.co/alerts/openai-silently-drops-canvas-from-gpt-55-update) says it was not announced via blog/changelog (secondary).
- **Lex**: AI invoked via "++" and "Checks" (grammar, brevity, clichés, custom criteria) that produce line-level suggestions highlighted in the document; human real-time collaboration with live cursors — [BuildFastWithAI review](https://www.buildfastwithai.com/ai-tools/lex) / [Lex reviews on Product Hunt](https://www.producthunt.com/products/lex-4/reviews) (secondary review sites).

### Inferences
- "AI as a named participant with its own cursor" is not shipped by Google, Microsoft, or Notion as of Sept 2026. It is, however, a documented pattern in Liveblocks (and trivially buildable with Yjs awareness), so Co-Pen should claim it as a *product-level UX differentiator versus the big suites*, not as a technical novelty.
- Microsoft's "shows what it's working on in real time" is the closest big-suite analogue to agent presence; worth watching.

### Gaps
- Could not confirm whether Word Agent Mode renders any in-document progress indicator (cursor/highlight) vs. only pane-side status; primary Tech Community post did not render.
- Microsoft Loop / Copilot Pages: not researched in depth this round (no citable 2026 findings gathered).
- Google Gemini "Canvas" (in the Gemini app, exporting to Docs), Figma/Canva multiplayer AI, Craft, NotebookLM, and "Cursor-for-prose" startups: no citable findings gathered this round.

## Q2. Can the AI edit while humans concurrently edit the same document? Any conflict handling?

### Takeaway
Only the SDK vendors explicitly document AI edits flowing into a live CRDT document alongside humans (Tiptap via Yjs/Hocuspocus; Liveblocks via Storage/Yjs). None of the sources describe explicit AI-vs-human conflict handling (e.g., region locking, re-basing an agent's plan when a human edits the same paragraph) — they rely on CRDT merge semantics.

### Cited Findings
- Tiptap Collaboration uses Yjs CRDTs, "a technology that allows simultaneous edits by multiple users without conflicts"; backend is Hocuspocus — [Tiptap Collaboration overview](https://tiptap.dev/docs/collaboration/getting-started/overview) (snippet); [Tiptap Collaboration product](https://tiptap.dev/product/collaboration).
- The AI Toolkit "is compatible with Tiptap's collaborative backend" — [Tiptap AI Toolkit product page](https://tiptap.dev/product/ai-toolkit) (snippet).
- Server AI Toolkit (pilot for Enterprise/Business, March 2026) edits documents "without the editor open in a browser", runs from scheduled jobs/webhooks, and integrates with Document Server/Collaboration so AI changes appear in users' editors in real time — [Tiptap Q1 2026 recap](https://tiptap.dev/blog/release-notes/recap-q1-2026).
- Tiptap client AI Toolkit Q1 2026: "significantly fewer diff mismatch errors", "Smarter diffs" (block-level then character-level), and "non-blocking suggestions" allowing "multiple rounds of changes while suggestions queue up" — [Tiptap Q1 2026 recap](https://tiptap.dev/blog/release-notes/recap-q1-2026). Diff-mismatch errors are the concrete symptom of a document changing under the AI.
- Liveblocks agents modify Storage via a JSON Patch (RFC 6902) REST endpoint, chosen because it is "well understood by LLMs" — [Liveblocks agentic workflows guide](https://liveblocks.io/docs/guides/enabling-agentic-workflows-with-liveblocks). Liveblocks advertises "multiplayer undo/redo" and live cursors — [Liveblocks Multiplayer](https://liveblocks.io/multiplayer) (snippet). Showcases titled "AI and humans editing together" and "Agents work simultaneously" exist — [showcase 1](https://liveblocks.io/showcase/ai-and-humans-editing-together), [showcase 2](https://liveblocks.io/showcase/agents-work-simultaneously) (page content did not render; description from search snippet only).
- Google Docs: Gemini suggested copy edits "remain private until you approve them" — [9to5Google](https://9to5google.com/2026/03/10/google-docs-gemini-upgrade/). Private-until-approved sidesteps concurrency: the AI never writes to the shared doc while others edit; the user commits.
- Notion: agent changes "are built on Notion's collaboration layer", reversible via version history — [Notion Agents product page](https://www.notion.com/product/agents) (snippet).

### Inferences
- Big suites avoid AI/human concurrency conflicts by design: the AI proposes (Google private suggestions, Word Replace/Insert) or acts on the user's behalf on the user's turn (Word Agent Mode, Notion Agent). Co-Pen's "agents keep editing while humans keep editing, in different sections" is a real UX step beyond this, but the underlying merge (CRDT) is commodity.
- Co-Pen's defensible angle here is *coordination policy* (section ownership/leases per role agent, what happens when a human types inside an agent's region, re-anchoring pending suggestions) — none of the sources document such a policy.

### Gaps
- No source describes what Word Agent Mode or Notion Agent do if a co-author edits the same paragraph mid-run.
- Liveblocks showcase implementation details (whether agents use region locks) unverified.

## Q3. Are AI edits shown as suggestions/tracked changes with accept/reject? Is AI-only undo supported?

### Takeaway
Suggestion/tracked-change review of AI edits is now mainstream: Word Copilot does word-level tracked changes (April 2026), Google Gemini produces reviewable suggested edits (March/July 2026), and Tiptap ships both ephemeral AI suggestions and persistent tracked changes for AI edits. Co-Pen must NOT claim "AI edits as tracked changes with accept/reject" as a differentiator. "AI-only undo" (undo only the AI's contributions while preserving interleaved human edits) is not explicitly documented anywhere found.

### Cited Findings
- **Word**: "Copilot can now track changes at the word level, so edits stay transparent and easy to review"; "You can turn on track changes and watch Copilot rewrite whole sections—or the whole document—with every edit shown as a tracked change"; initially Windows desktop, Office Insiders Beta / Frontier, announced ~Apr 15, 2026 — [The Decoder](https://the-decoder.com/microsoft-copilot-in-word-can-now-track-changes-and-manage-comments/) (secondary); primary post: [Microsoft Tech Community: Copilot in Word – New Capabilities for Document Workflows](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/copilot-in-word-new-capabilities-for-document-workflows/4508974) (did not render; snippet says track changes are "visible by default" and edits "transparent, auditable, and granular"); also announced by [Satya Nadella on LinkedIn](https://www.linkedin.com/posts/satyanadella_new-in-word-copilot-now-tracks-changes-activity-7449881077600641024-92HA) (snippet).
- **Word Agent Mode GA date conflict**: GA April 22, 2026 per [pasqualepillitteri.it](https://pasqualepillitteri.it/en/news/1401/microsoft-copilot-agent-mode-word-excel-powerpoint-april-2026) (secondary) vs. default in Word "as of April 27, 2026" per [Office Watch](https://office-watch.com/2026/copilot-agent-mode-word-excel-powerpoint/) (secondary). Likely GA announcement vs. rollout date; unresolved.
- **Word limitation**: a snippet states "Agent Mode in Word cannot add or modify comments in your Word document at this time" — surfaced via search around [Microsoft Support: Agent Mode in Word](https://support.microsoft.com/en-gb/office/agent-mode-in-word-647d5d14-eaec-4e8a-a574-7cefffa7f8f0) / [WindowsForum](https://windowsforum.com/threads/copilot-in-word-gets-word-level-track-changes-comments-and-better-structure.413242/) (snippet; may conflict with the Apr 2026 "manage comments" announcement — possibly the non-agent Copilot handles comments).
- **Word legal agent**: a Copilot "Legal Agent" in Word redlines documents with comments — [M365 Admin](https://m365admin.handsontek.net/microsoft-365-copilot-legal-agent-word/); [Chris Menard Training](https://chrismenardtraining.com/post/how-to-use-the-copilot-legal-agent-to-redline-documents-in-word/) (secondary).
- **Google Docs**: Gemini "suggests copy edits for you to review and accept. These edits remain private until you approve them" (Mar 2026) — [9to5Google](https://9to5google.com/2026/03/10/google-docs-gemini-upgrade/). Comment-driven suggested edits users can "review, approve, and seamlessly apply" (rollout from Jul 28, 2026; Business Standard/Plus, Enterprise, Education Plus, Google AI Pro/Ultra) — [Workspace Updates](https://workspaceupdates.googleblog.com/2026/07/streamline-collaboration-in-google-docs-with-Gemini-powered-comment-workflows.html).
- **Tiptap**: two review strategies — (1) Tracked Changes extension: persistent, "visible to other users", enabled via `reviewOptions.mode = 'trackedChanges'`; (2) AI Toolkit Suggestions: "decoration-based UI that's ephemeral and only visible to the current user", with Preview mode (doc unchanged until accept) and Review mode (applied immediately, suggestions let users undo) — [Tiptap: Review changes](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/review-changes); [Use with Tracked Changes](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/review-changes/tracked-changes); [Review AI changes with suggestions](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/review-changes/suggestions). `acceptSuggestion`/`rejectSuggestion`/`acceptAllSuggestions`/`rejectAllSuggestions` return `aiFeedback` events to send back to the model — same source. Tracked Changes was in early access in Q1 2026 — [Tiptap Q1 2026 recap](https://tiptap.dev/blog/release-notes/recap-q1-2026).
- **Notion**: changes are reversible through standard undo/version history; "every agent run logged and all changes reversible" — [Notion Agents product page](https://www.notion.com/product/agents) (snippet); [TechAhead guide](https://www.techaheadcorp.com/blog/notion-3-ai-agents/) (secondary). No tracked-changes-style inline review of agent page edits found. Notion 3.7 adds confirmations so "nothing changes in a connected tool until you approve it" (applies to external tools) — [Notion release Sept 15 2026](https://www.notion.com/releases/2026-09-15).
- **ChatGPT Canvas** had a "Show changes" diff; the replacement writing blocks "don't document a general-purpose diff view" — [ai-toolbox.co](https://www.ai-toolbox.co/chatgpt-management-and-productivity/how-to-use-chatgpt-canvas-guide-2026) (secondary).
- **Lex** Checks show line-level suggestions highlighted in context — [BuildFastWithAI](https://www.buildfastwithai.com/ai-tools/lex) (secondary).

### Inferences
- Accept/reject review of AI edits is table stakes in 2026. Co-Pen's differentiation must come from *what* is attached to each suggestion (which agent/role authored it, why, verification status) and *how* it coexists with live human editing.
- Undo in all found products is either (a) per-suggestion reject, (b) the user's own Ctrl+Z / Replace flow, or (c) page version history (Notion). A selective "revert all of agent X's accepted changes while keeping humans' later edits" is not documented anywhere found — plausible Co-Pen differentiator, but claim cautiously ("not found in public docs"), since Liveblocks' multiplayer undo and Yjs UndoManager (tracked origins) make it technically feasible for anyone.

### Gaps
- Whether Word tracked changes made by Copilot are attributed to "Copilot" or to the invoking user in the revision author field: not confirmed by any fetched source.
- Whether Google's Gemini suggestions become standard Docs "Suggesting mode" suggestions visible to co-authors after approval, and under whose name: not confirmed.

## Q4. Multiple agents in parallel?

### Takeaway
Multi-agent exists in two forms: (1) Notion's orchestration (Custom Agents calling sub-agents, Sept 2026) — workflow/automation-level, not parallel co-editing of one page; (2) SDK-level demos (Liveblocks "Agents work simultaneously", Tiptap multi-document agent). No end-user doc editor was found shipping *multiple role agents concurrently editing different sections of the same document with humans present*.

### Cited Findings
- Notion 3.7 (Sept 15, 2026): Custom Agents can "call other Custom Agents as sub-agents, each with its own instructions, context, access, and model"; also Skills ("reusable instructions that teach AI how your team works") and an Agent SDK in public beta — [Notion release Sept 15 2026](https://www.notion.com/releases/2026-09-15).
- Custom Agents (team-wide, scheduled/triggered) shipped around Feb 2026 — [eesel.ai review](https://www.eesel.ai/blog/notion-ai-review) (secondary); earlier limitation: editing one agent locks you to it in a chat session — [becomeanaimarketer](https://www.becomeanaimarketer.com/p/how-i-built-a-multi-agent-ai-system-in-notion-free-template) (secondary, 2025).
- Liveblocks: "Multiple agents work simultaneously, each with its own presence cursor" — [Liveblocks showcase: Agents work simultaneously](https://liveblocks.io/showcase/agents-work-simultaneously) (snippet only; page body did not render). Liveblocks also announced "Feeds and APIs for Agent Workflows" — [Liveblocks blog](https://liveblocks.io/blog/introducing-feeds-and-apis-for-agent-workflows) (not fetched).
- Tiptap documents a "Multi-document AI agent" — [Tiptap docs](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/multi-document) (not fetched; title only).
- Google and Microsoft: no source found describing multiple concurrent agents editing one document. Microsoft's Wave 3 includes "Cowork" and "Agent 365" (agent management) — [ProServeIT](https://www.proserveit.com/blog/microsoft-copilot-wave-3-updates-cowork-agent-mode-agent-365-unpacked) (secondary, not fetched).

### Inferences
- "Multiple named role agents (drafter, style editor) co-editing different parts of one doc in parallel, visible as distinct cursors" is Co-Pen's strongest *product* differentiator vs. suites. But because Liveblocks publicly demos simultaneous multi-agent presence, Co-Pen should not claim to be "the first" — claim a complete end-user workflow (roles + region coordination + per-agent review/undo), not the primitive.

### Gaps
- Details of the Liveblocks multi-agent showcase (text doc vs. canvas; conflict handling) unverified.
- Figma/Canva multi-agent features not researched.

## Q5. Provenance/attribution of AI text, disclosure, audit logs, verification/citation support

### Takeaway
Provenance marking for AI-written *text* inside collaborative docs is essentially absent: Google's Content Credentials cover Gemini-generated images/video/audio, not text; Word's tracked changes give reviewable diffs but author attribution is unclear. Audit exists at the agent-run level (Notion activity logs, Microsoft "auditable" tracked changes), and Tiptap supports attaching comment threads explaining each AI change. No product found offers risky-fact verification flags on AI-inserted text.

### Cited Findings
- Google Workspace: "On images, videos, and audio generated by Gemini in supported Workspace apps, you will see 'Content Credentials'"; help page does not cover text — [Google Docs Editors Help: AI labels & content credentials](https://support.google.com/docs/answer/17560328?hl=en). SynthID claims coverage of text in Google AI tools generally — [dev.to overview](https://dev.to/alifar/google-expands-gemini-content-verification-with-synthid-and-content-credentials-3hh1) (secondary), but no Docs-level visible text provenance was found.
- Microsoft: track changes make Copilot edits "transparent, auditable, and granular" (snippet of [Tech Community post](https://techcommunity.microsoft.com/blog/microsoft365copilotblog/copilot-in-word-new-capabilities-for-document-workflows/4508974)); Office Watch notes transparency on *why* Copilot made decisions is still "forthcoming" and advises starting with easily verifiable tasks — [Office Watch](https://office-watch.com/2026/copilot-agent-mode-word-excel-powerpoint/) (secondary).
- Notion: "Activity logs record every run so changes are visible and reversible"; a "Thinking" log shows the agent's steps/sources — [Notion Agents](https://www.notion.com/product/agents) (snippet); [TechAhead](https://www.techaheadcorp.com/blog/notion-3-ai-agents/) (secondary). Custom Agent Insights via Public API (Sept 2026) — [Notion release Sept 15 2026](https://www.notion.com/releases/2026-09-15).
- Tiptap: "Tracked changes with comments" combines AI tracked changes with comment threads "that explain each AI-generated change" — [Tiptap docs](https://tiptap.dev/docs/ai/ai-toolkit/client/agents/review-changes/tracked-changes-with-comments) (snippet). This is a direct analogue of Co-Pen's "explanation cards".
- Liveblocks: `markdownToCommentBody` helper lets agents post replies into comment threads — [Liveblocks May 2026](https://liveblocks.io/blog/whats-new-in-liveblocks-may-2026).
- Google Gemini "Help me create" grounds drafts in Gmail, Drive, Chat, and the web — [9to5Google](https://9to5google.com/2026/03/10/google-docs-gemini-upgrade/); whether inline citations to those sources are inserted in the doc was not confirmed.

### Inferences
- Persistent, per-span provenance of AI text (which agent, which model/prompt, human-edited-after or not) that survives acceptance is not offered by any product found — a genuine Co-Pen differentiator. Note: once a Word tracked change is accepted, the revision mark disappears, and Google's labels are media-only.
- Verification flags for risky facts (numbers, dates, names, citations) on AI text: not found anywhere — genuine differentiator, but Co-Pen should phrase it as "not found in public docs as of Sept 2026".
- Explanation cards: partial overlap with Tiptap (comment explaining each AI change) and Word's real-time "what it's working on"; differentiate on structure (reason + source + risk + role) rather than on the concept.
- Audit log: overlap with Notion activity logs and Microsoft's "auditable" framing; differentiate by *document-level, per-span* audit rather than per-run.

### Gaps
- Word revision-author attribution for Copilot edits and whether Microsoft Purview audit captures Copilot document edits: not verified.
- Whether Gemini inserts citations into Docs for web-grounded content: not verified.

## Q6. Synthesis: comparison table, Co-Pen differentiators, and overlaps to avoid over-claiming

### Takeaway
Co-Pen overlaps with competitors on "AI edits as reviewable suggestions" and "activity/audit logging"; it is differentiated on (1) named multi-role agents as live cursor participants in an end-user editor, (2) parallel agent editing alongside humans with region coordination, (3) AI-only / per-agent undo, and (4) per-span provenance + risky-fact verification flags. Items (1)-(2) are buildable with Liveblocks/Tiptap primitives, so the claim is "integrated end-user workflow", not "novel technology".

### Cited Findings
Feature comparison (Y = documented; P = partial; N = not found in sources; ? = unverified). Each cell is backed by the findings/URLs in Q1-Q5.

| Feature | Google Docs + Gemini | Word + Copilot (Agent Mode) | Notion Agents | Tiptap AI Toolkit (SDK) | Liveblocks (SDK) | ChatGPT Canvas | Lex |
|---|---|---|---|---|---|---|---|
| AI as visible participant (cursor/presence) | N (side panel/bottom bar) | P (shows progress in real time; no cursor found) | N (chat / embedded agent) | P (streams edits live; no named cursor found) | Y (AI presence API, TTL, appears in useOthers) | N (retired May 28, 2026) | N |
| AI edits while humans co-edit (live, shared doc) | N (private until approved) | ? | P (runs on collaboration layer) | Y (Yjs/Hocuspocus; Server AI Toolkit pilot Mar 2026) | Y (Storage JSON Patch, Yjs) | N (single-user) | ? |
| Explicit AI/human conflict policy | N | N | N | P (diff-mismatch reduction, queued suggestions) | N | N | N |
| AI edits as suggestions/tracked changes w/ accept-reject | Y (Mar & Jul 2026) | Y (word-level, Apr 2026) | N (direct edits + undo/history) | Y (ephemeral suggestions + persistent tracked changes) | N (not documented) | P ("Show changes" diff) | Y (Checks suggestions) |
| AI-only / per-agent undo | N | N | P (version history) | P (reject suggestions) | P (multiplayer undo) | N | N |
| Multiple agents in parallel | N | N | P (sub-agents, Sept 2026; workflow-level) | P (multi-document agent) | Y (showcase, snippet only) | N | N |
| Provenance of AI text persisting after acceptance | N (credentials media-only) | ? | N | N | N | N | N |
| Explanation of each AI change | N | P (live progress) | P ("Thinking" log) | Y (tracked changes with comments) | P (agent comment replies) | N | N |
| Verification flags for risky facts | N | N | N | N | N | N | N |
| Audit log of AI actions | ? | P ("auditable" tracked changes) | Y (activity logs per run) | N | N | N | N |

Key dates: Gemini Docs refresh Mar 10, 2026 ([9to5Google](https://9to5google.com/2026/03/10/google-docs-gemini-upgrade/)); Gemini comment workflows from Jul 28, 2026 ([Workspace Updates](https://workspaceupdates.googleblog.com/2026/07/streamline-collaboration-in-google-docs-with-Gemini-powered-comment-workflows.html)); Word Copilot tracked changes ~Apr 15, 2026 ([The Decoder](https://the-decoder.com/microsoft-copilot-in-word-can-now-track-changes-and-manage-comments/)); Word Agent Mode GA Apr 22 or 27, 2026 (conflict, see Q3); Notion 3.0 Sept 18, 2025 ([Notion](https://www.notion.com/releases/2025-09-18)); Notion 3.7 sub-agents Sept 15, 2026 ([Notion](https://www.notion.com/releases/2026-09-15)); Tiptap Server AI Toolkit pilot & Tracked Changes early access Q1 2026 ([Tiptap](https://tiptap.dev/blog/release-notes/recap-q1-2026)); Liveblocks agent presence guides Jun 2026 ([Liveblocks](https://liveblocks.io/blog/whats-new-in-liveblocks-may-2026)); ChatGPT Canvas removed May 28, 2026 ([ai-toolbox.co](https://www.ai-toolbox.co/chatgpt-management-and-productivity/how-to-use-chatgpt-canvas-guide-2026)).

### Inferences
**Defensible differentiators (phrase as "not found in public docs of Google/Microsoft/Notion as of Sept 2026"):**
1. Multiple *role-specialized* agents (drafter, style editor) as named, cursor-bearing participants in an end-user editor, working in parallel on different sections while humans keep editing. Suites use one assistant per user turn.
2. A coordination policy for AI/human concurrency (section ownership, yielding when a human enters an agent's region, re-anchoring pending suggestions) — nobody documents this.
3. AI-only / per-agent undo that reverts an agent's contributions without clobbering interleaved human edits.
4. Persistent per-span provenance of AI text (agent, role, model, accepted-by, human-modified) that survives acceptance, plus risky-fact verification flags. Nothing comparable found; Google's credentials cover media only.
5. Integrated trust layer (provenance + verification + explanation + audit) in one review UI, versus fragments elsewhere.

**Overlaps — do NOT over-claim:**
- "AI edits appear as tracked changes/suggestions with accept/reject" — shipped by Word (word-level, Apr 2026), Google Docs (Mar/Jul 2026), Tiptap; also Lex.
- "AI edits live in a real-time collaborative doc via CRDT" — Tiptap AI Toolkit + Collaboration, Liveblocks.
- "AI has presence/cursor" — Liveblocks AI Presence API and demos; say "first-class in our end-user UX", not "first".
- "Multiple agents" — Liveblocks showcase (simultaneous agents), Notion sub-agents (orchestration).
- "Explanation of AI changes" — Tiptap "tracked changes with comments", Notion "Thinking" log, Word real-time progress.
- "Audit log" — Notion activity logs; Microsoft markets tracked changes as "auditable".
- Implementation note: Co-Pen can likely *build on* Tiptap/Liveblocks/Yjs primitives; positioning should acknowledge this.

### Gaps
- Microsoft Loop / Copilot Pages, Google Gemini Canvas, Figma/Canva AI, Craft, NotebookLM, and "Cursor-like prose editors" were not covered with citable sources in this pass; recommend a follow-up search if the report needs them.
- Several Liveblocks and Microsoft primary pages failed to render; claims from them are snippet-level and should be spot-checked in a browser before publication.
