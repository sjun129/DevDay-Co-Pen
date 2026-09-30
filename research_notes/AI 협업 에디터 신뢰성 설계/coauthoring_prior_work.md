# Prior Work: Human-AI Co-Writing and Real-Time Collaborative Editing, as It Applies to Co-Pen (AI Agents as Participants in a Yjs/TipTap Document)

Scope note: researched 2026-09-30. Publication years are given for each item. Items marked "arXiv preprint" are not peer-reviewed. A few very recent arXiv items (Aug–Sep 2026) were only verified at the abstract level.

## 1. Ink & Switch research (Upwelling, Peritext, Patchwork / Universal Version Control, AI bots in documents)

### Takeaway
Ink & Switch has already shown that (a) AI bots can be modeled as "just another collaborator" whose edits land on a reviewable branch/draft, and (b) automatic CRDT merging handles syntactic conflicts but semantic conflicts still need a human. Co-Pen's live, cursor-bearing, streaming agent inside the main real-time document, together with an LLM that resolves semantic conflicts, goes a step beyond this. Their branch/draft model is not real-time, and their bots do not rebase their intent when a human edits concurrently.

### Cited Findings
- **Upwelling (March 2023; McKelvey, Jenson, Wagner, Cook, Kleppmann).** Documents are organized into titled *drafts* (unmerged layers) on top of a *stack* (merged history). Collaborators edit in real time inside a draft. Work across drafts is asynchronous. — [Ink & Switch: Upwelling](https://www.inkandswitch.com/upwelling/)
- Upwelling's goal was to avoid the "fishbowl effect", where writers feel watched in real-time tools like Google Docs. Professional writers wanted creative privacy while drafting. — [Upwelling](https://www.inkandswitch.com/upwelling/)
- **Floating drafts.** When one draft merges onto the stack, every other open draft automatically rebases onto the new state. This surfaces conflicts early, and reviewers see exactly what will be published. — [Upwelling](https://www.inkandswitch.com/upwelling/)
- Change tracking is always on and records every edit with its author. Reviewers judge a whole draft rather than individual keystrokes. — [Upwelling](https://www.inkandswitch.com/upwelling/)
- Key finding: "automatic merging handles syntax conflicts but requires human review for semantic ones". Smaller, focused drafts reduce conflict risk. Review processes worked better as social conventions than as rules the software enforced. — [Upwelling](https://www.inkandswitch.com/upwelling/)
- Upwelling was built on Automerge (CRDT) and Peritext for rich text, with TypeScript, React and ProseMirror. The essay does not mention AI. — [Upwelling](https://www.inkandswitch.com/upwelling/)
- **Peritext (CSCW 2022, PACMHCI 6(CSCW2) Art. 531; Litt, Lim, Kleppmann, van Hardenberg).** A CRDT for rich text, built around an explicit model of *intent preservation* for concurrent formatting edits (for example, how bold spans expand when text is inserted at a boundary). — [ACM DL](https://dl.acm.org/doi/10.1145/3555644); [Ink & Switch essay](https://www.inkandswitch.com/peritext/); [paper PDF](https://www.inkandswitch.com/peritext/cscw-publication.pdf)
- **Patchwork (2024–2026)** is Ink & Switch's research project on "universal version control" for writers, developers and other creatives. It aims to bring branches, diffs and history to non-developers. — [Universal Version Control](https://www.inkandswitch.com/universal-version-control/); [Patchwork notebook 01](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/01/); [Simon Willison summary, May 2024](https://simonwillison.net/2024/May/8/universal-version-control/)
- **"AI bots in version control" (Patchwork notebook 07, 19 March 2024).** A bot edits as another collaborator. It "puts changes on a branch, which you can choose to partially or completely merge—just like you would suggestions from a human coauthor." The history shows which edits came from the bot. — [Patchwork notebook 07](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/07/)
- In that work, bots were useful for **style guide editing** and **voice transcript cleanup**. A variant where the bot leaves comments explaining each edit helped users decide whether to accept it. Bot prompts are themselves versioned documents, so a prompt can have history and branches. — [Patchwork notebook 07](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/07/)
- The Universal Version Control overview names collaboration with "LLMs and other AI agents" as a current need. It does not describe a solution for concurrent human-AI edits. — [Universal Version Control](https://www.inkandswitch.com/universal-version-control/)
- Ink & Switch's newer platform, GAIOS, is derived from Patchwork and uses Automerge-powered version control. — [Ink & Switch Dispatch 014](https://www.inkandswitch.com/newsletter/dispatch-014/)

### Inferences
- Co-Pen's "style editor" role agent matches exactly the task Ink & Switch reported as working well (style-guide editing). That is external support for the role choice.
- Ink & Switch places bot edits on a **separate branch** (asynchronous, reviewed later). Co-Pen streams **inline suggestions into the live shared document** with a visible cursor. This is a different point in the design space: more immediate, but it creates the concurrent-edit conflicts that branches avoid. Co-Pen's "semantic rebase" is effectively an LLM-powered version of Upwelling's *floating drafts* rebase. Upwelling rebases syntactically and leaves semantic conflicts to humans. Co-Pen tries to resolve the semantic conflict automatically while protecting the human's change. This is the strongest novelty claim relative to Ink & Switch.
- Upwelling's lesson that smaller drafts mean fewer conflicts supports scoping each AI job to a paragraph or block, and making each job its own undo and review unit.
- The "bot explains its edit in a comment" finding is cheap to copy: attach a rationale to each AI job, for example in the Y.UndoManager stack-item `meta` or as a TipTap comment mark.
- Upwelling's "fishbowl effect" warns that a visible AI cursor constantly rewriting nearby text could feel intrusive. Co-Pen could reuse Upwelling's answer: a "private draft" mode, or restricting AI edits to suggestion marks until the user accepts them.

### Gaps
- I found no Ink & Switch publication (2024–2026) that specifically studies **real-time** AI agents typing into a CRDT document alongside humans, or that addresses an agent's rewrite colliding with a concurrent human edit. Notebook 07 does not describe concrete concurrency problems.
- I could not confirm whether Patchwork published a formal paper (as opposed to lab notebook entries) by September 2026.

## 2. Selective undo in collaborative editing, and whether per-origin (per-AI-job) undo is sound in Yjs

### Takeaway
Per-actor or per-origin selective undo is well established. Prakash & Knister (1994) and Sun's ANYUNDO (2000/2002) both treat undo as a *new inverse operation* integrated with the concurrent edits, not as a rollback. Stewen & Kleppmann (2024) found that mainstream tools use *local* (own-actions-only) undo and argue that it matches what users expect. Y.UndoManager with `trackedOrigins` implements this local/selective model. So "undo only this AI job" is sound in principle. The known pitfalls are (i) undoing text a human has since edited or depends on, (ii) overlapping scopes when several UndoManagers exist, and (iii) capture-timeout merging, which can mix separate jobs into one undo step.

### Cited Findings
- **Prakash & Knister, "A framework for undoing actions in collaborative systems," ACM TOCHI 1(4):295–330, Dec 1994.** Lets users reverse their own changes individually. It explicitly handles *conflicts* between users' operations that can make an undo impossible or ill-defined. Implemented in the DistEdit group-editor toolkit. — [ACM DL](https://dl.acm.org/doi/10.1145/198425.198427)
- **Sun, "Undo any operation at any time in group editors" (CSCW 2000) and "Undo as concurrent inverse in group editors" (ACM TOCHI 2002).** ANYUNDO treats an undo command as a *concurrent inverse operation* through operational transformation, so any operation can be undone whatever its context. Undo *policy* is separated from undo *mechanism*, so single-step, chronological and **selective** undo can coexist in one session. Built on the GOTO integration algorithm. — [ACM DL, CSCW 2000](https://dl.acm.org/doi/10.1145/358916.358990); [ACM DL, TOCHI 2002](https://dl.acm.org/doi/10.1145/586081.586085)
- **Yu, Ignat et al., "A CRDT Supporting Selective Undo for Collaborative Text Editing" (DAIS 2015)** is an early CRDT-based selective undo for text. — [Springer](https://link.springer.com/chapter/10.1007/978-3-319-19129-4_16); [PDF](https://members.loria.fr/CIgnat/files/pdf/YuDAIS15.pdf)
- **Dolan, "The Only Undoable CRDTs are Counters" (PODC 2020 brief announcement)** is a theoretical impossibility result for "true" undo in CRDTs. Stewen & Kleppmann work around it by letting the internal state keep advancing and restoring only the *external* (visible) value. — [ACM DL](https://dl.acm.org/doi/10.1145/3382734.3405749); discussed in [Stewen & Kleppmann](https://arxiv.org/html/2404.11308v1)
- **Stewen & Kleppmann, "Undo and Redo Support for Replicated Registers," PaPoC 2024 (April 2024).** They surveyed mainstream tools (Google Sheets, Excel Online, Figma) and found that all use **local undo**: users undo only their own recent operations, even when remote edits happened in between. They argue global undo confuses users because users may not know about remote edits. They propose "undo-redo neutrality" (n undos followed by n redos restores the original state). They show that counter-based visibility schemes cannot implement local undo correctly. They note that Yjs uses last-writer-wins registers (for map/attribute values), which lose concurrent values. — [arXiv HTML](https://arxiv.org/html/2404.11308v1); [ACM DL](https://dl.acm.org/doi/10.1145/3642976.3653029)
- **Y.UndoManager semantics (Yjs docs).**
  - `trackedOrigins` is a Set of transaction origins to record, and the UndoManager itself is always included.
  - `captureTimeout` (default 500 ms) merges edits that happen within the window into one stack item. `stopCapturing()` forces a boundary.
  - `scope` is the shared type(s) being tracked.
  - Events: `stack-item-added`, `stack-item-popped`, `stack-item-updated`.
  - Each stack item has a `.meta` Map, for example to store cursor positions.

  — [Yjs docs: Y.UndoManager](https://docs.yjs.dev/api/undo-manager); [docs source](https://github.com/yjs/docs/blob/main/api/undo-manager.md)
- A common Yjs pattern is to scope an UndoManager to a single origin (for example, one editor binding) so that each client "never reverts a remote peer's edits". — [Yjs repo](https://github.com/yjs/yjs); [example PR](https://github.com/Harshith-ney/codeSync/pull/1)
- A historical Yjs issue concerns merging undo operations from different sources. — [yjs/yjs issue #273](https://github.com/yjs/yjs/issues/273)

### Inferences
- **Soundness:** "one Y.UndoManager per AI job, tracking only that job's origin object" is the local/selective undo model that Prakash & Knister, Sun and Stewen & Kleppmann all support. Co-Pen generalizes "per user" to "per AI job", which is a framing worth highlighting to judges. Yjs undo in text removes the items that the tracked transactions inserted and restores the items they deleted, all as new forward operations. This fits Dolan's result, which says real CRDT undo must be "inverse as new op".
- **Pitfall 1: human edits inside AI text.** If a human types inside a span the AI inserted, the human's characters are separate Yjs items with a different origin. Undoing the AI job deletes the AI's characters and leaves orphaned human fragments. This is the "undo conflict" case from Prakash & Knister. Recommended handling: before undoing, detect whether any non-job items fall inside the job's range. If so, warn the user, or apply a semantic rebase in reverse ("remove AI contribution, keep human's").
- **Pitfall 2: formatting / LWW.** Formatting attributes behave like LWW registers. Undoing an AI formatting change can clobber a later human formatting change on the same range (the concern Stewen & Kleppmann raise about Yjs LWW).
- **Pitfall 3: captureTimeout.** Streaming tokens arrive continuously, so either set `captureTimeout` very high to make the whole job one item, or call `stopCapturing()` only at job boundaries. Each job's UndoManager must track a *unique origin object* (not a shared string), so that two parallel role agents don't share a stack.
- **Pitfall 4: many UndoManagers.** Every UndoManager observes the document's transactions. N jobs means N observers, so disposing finished or accepted jobs (`destroy()`) matters for memory and performance. (This is an inference from the API; I found no benchmark.)
- **Pitfall 5: semantic rebase interaction.** When an AI rewrite is rebased, the rebased write must use the *same job origin*, or undo will only revert part of the job.

### Gaps
- I could not retrieve the Yjs forum thread on "UndoManager with external updates" (TLS certificate error), so there is no official statement from the Yjs author on multiple UndoManagers over the same scope. — [discuss.yjs.dev thread](https://discuss.yjs.dev/t/undomanager-with-external-updates/454) (not fetched)
- I found no published study or benchmark of "per-agent" or "per-AI-job" undo specifically. This appears to be unexplored, which is a novelty opportunity.

## 3. Human-AI co-writing studies (CoAuthor, ownership/agency, homogenization, team settings)

### Takeaway
The HCI literature finds that LLM suggestions (a) shift perceived authorship and ownership away from the writer, and do so more when the writer has less influence over the text, and (b) instruction-tuned models homogenize content across writers. Co-Pen's design choices address both findings: suggestions rather than direct writes, visible attribution, per-job undo, and preserving human edits during rebase. The closest system is Lehmann, Shauchenka & Buschek (CHI 2026), a Yjs-based shared editor with multiple users and shared AI agents. It delivered agent output through comments and suggestions, and teams treated the agents as shared tools, not teammates.

### Cited Findings
- **CoAuthor (Lee, Liang, Yang; CHI 2022).** A keystroke-level dataset of GPT-3-assisted writing: 1,445 sessions (830 stories from 58 writers, 615 essays from 49 writers), about 418 words and 11.8 AI interactions per session on average. It captures the writing *process* as event logs and ships a public replay interface. — [ACM DL](https://dl.acm.org/doi/10.1145/3491102.3502030); [arXiv](https://arxiv.org/abs/2201.06796); [PDF](https://www-cs.stanford.edu/~minalee/pdf/chi2022-coauthor.pdf)
- **Padmakumar & He, "Does Writing with Language Models Reduce Content Diversity?" (ICLR 2024).** Essays co-written with InstructGPT were more similar to each other, with lower lexical and content diversity. Essays co-written with base GPT-3 were not significantly different from solo essays. The feedback-tuned model reused the same "safe" phrases across users. — [ICLR proceedings PDF](https://proceedings.iclr.cc/paper_files/paper/2024/file/02dec8877fb7c6aa9a79f81661baca7c-Paper-Conference.pdf); [arXiv](https://arxiv.org/pdf/2309.05196)
- **Anderson, Shah & Kreminski, "Homogenization Effects of LLMs on Human Creative Ideation" (C&C 2024)** found related homogenization effects in creative ideation. — [ACM DL](https://dl.acm.org/doi/10.1145/3635636.3656204); [arXiv](https://arxiv.org/html/2402.01536v1)
- **Draxler et al., "The AI Ghostwriter Effect" (ACM TOCHI, 2024; n1=30, n2=96).** Users do not see themselves as authors of AI-generated text, yet often do not declare AI authorship. **More influence over the text increased the sense of ownership.** Personalization did not change the effect. — [ACM DL](https://dl.acm.org/doi/10.1145/3637875); [arXiv](https://arxiv.org/abs/2303.03283)
- **Lehmann, Shauchenka, Buschek, "Collaborative Document Editing with Multiple Users and AI Agents" (CHI 2026).**
  - The authors describe it as the first investigation of multiple people working with multiple shared AI agents in one document.
  - Design: **user-defined agent profiles and tasks** as shared objects. Agent output appears through **comments and suggestions**, not direct edits. Sync uses **Yjs**.
  - Study: 1 week, 30 participants in 14 teams.
  - Findings: teams folded agents into existing norms rather than treating them as team members. Agent profiles were seen as personal territory, while created agents and their outputs became shared resources.

  — [arXiv 2509.11826](https://arxiv.org/abs/2509.11826); [ACM DL](https://dl.acm.org/doi/10.1145/3772318.3790648)
- **DocuTeam (Lee, Choi, Kim, Kim, Seering; arXiv preprint, Sep 2026).** Mixed-initiative agents watch document changes and proactively start discussions. With 20 participants, outputs were rated significantly more novel, relevant and specific than a baseline, with no increase in cognitive load. Document changes triggered agent reactions, which led users to revisit their work. — [arXiv 2609.29309](https://arxiv.org/pdf/2609.29309)
- A 2025 review reassesses collaborative-writing theory in light of LLMs. — [arXiv 2505.16254](https://arxiv.org/pdf/2505.16254)
- CollabStory studies multi-LLM collaborative story generation and authorship. — [arXiv 2406.12665](https://arxiv.org/html/2406.12665v3)

### Inferences
- Draxler et al. found that more human influence means more ownership. That supports Co-Pen's accept/reject suggestions, per-job undo, and *especially* semantic rebase, which guarantees the human's concurrent change survives. It can be framed as a mechanism for preserving ownership.
- Lehmann et al. (CHI 2026) is the **closest prior system** and should be cited directly. Differences Co-Pen can claim:
  - agents are live participants with cursors and presence, streaming into the text, instead of comment-only output;
  - parallel role agents edit the same document concurrently;
  - concurrency-aware semantic rebase;
  - per-job selective undo.

  Their finding that teams did not treat agents as teammates suggests Co-Pen should not over-sell "AI as teammate". A defensible framing is "AI as an accountable, reversible participant".
- Homogenization (Padmakumar & He) suggests the style-editor agent should preserve the author's voice, for example with a few-shot prompt built from the user's own paragraphs. An evaluation could measure how much of the human's text survives a rebase.
- CoAuthor-style keystroke/event logging is an easy evaluation method to reuse. Co-Pen already has Yjs update history per origin, so it can report metrics such as "% of final text by origin" and "human edits preserved across rebases".

### Gaps
- I did not retrieve the full Lehmann et al. paper, so I don't know whether it handled concurrent human-AI edits to the same span.
- I did not verify specific 2025–2026 CSCW papers framing "AI as teammate vs. tool" beyond Lehmann et al.

## 4. Semantic / intent-level merging with LLMs (code and text), and concurrent human-AI edits to the same text

### Takeaway
LLM merge-conflict resolution is an active area for **code**: MergeBERT (2021/22), ConGra (2024), Merge-Bench (2026), and empirical LLM-vs-search studies (2026). Recent models resolve roughly 50–60% of real conflicts to an equivalent-or-better result. For **prose**, nearly all the evidence is from practitioner tools and GitHub issues, not peer-reviewed research. I found no peer-reviewed study of LLM 3-way merging of concurrent **human vs. AI** prose edits in a live CRDT editor. That is Co-Pen's clearest research gap to claim.

### Cited Findings
- **MergeBERT / "Program Merge Conflict Resolution via Neural Transformers"** (Svyatkovskiy et al., arXiv 2021; FSE 2022) is the neural merge-resolution baseline. — [arXiv 2109.00084](https://arxiv.org/pdf/2109.00084)
- **ConGra (2024)** is a benchmark for automatic conflict resolution, graded by conflict complexity. — [arXiv 2409.14121](https://arxiv.org/pdf/2409.14121)
- **Merge-Bench (arXiv, 2026).**
  - A test-free evaluation paradigm, plus LLMergeJ, trained with online RL: 49% exact match and 59% source-code match on real conflicts.
  - "Aggressive" resolvers (LLMergeJ, Gemini 2.5 Pro, Claude Opus 4) resolved 51.2–62.5% of conflicts to normalized-equivalent-or-better, and left 3.4–21.2% unresolved.

  — [arXiv 2605.25890](https://arxiv.org/html/2605.25890v1)
- **LLM-based vs. search-based merge conflict resolution (arXiv, 2026).** MergeGen (an LLM) had a 70.6% probability of producing a better resolution than the search-based SBCR. It struggles with non-English content and large inputs, which can **truncate** resolutions. — [arXiv 2605.16646](https://arxiv.org/html/2605.16646v1)
- A study of real Java merge conflicts evaluates LLMs with a calibrated LLM-as-judge. — [arXiv 2607.27674](https://arxiv.org/pdf/2607.27674)
- Rover: context-aware conflict resolution with an LLM. — [arXiv 2605.17279](https://arxiv.org/pdf/2605.17279)
- **reconcile-text (Andras Schmelczer; v0.13.2, 27 Sep 2026, MIT; Rust/JS/Python).** A 3-way text merge that **never emits conflict markers**. It applies both sides using an OT-inspired algorithm, repositions cursors and selections, and tokenizes by word by default. It is a non-LLM baseline or fallback for the rebase. — [PyPI](https://pypi.org/project/reconcile-text/)
- Practitioner evidence for the exact Co-Pen scenario: an open issue in an AI coding/paper tool says that if a human types while an agent is generating, applying the agent's changes against the old base can lose the human's edits. It proposes a **snapshot-base 3-way merge** (base = the revision the agent read) so that non-overlapping regions both survive. — [harmoniqs/amicode issue #1627](https://github.com/harmoniqs/amicode/issues/1627)
- The Forked (Swift) sync library has a feature request for LLM-based 3-way merging of text. It argues that with a base, both versions and an LLM, a good merge of prose is feasible, and that prose tolerates imperfect merges better than code does. — [drewmccormack/Forked issue #5](https://github.com/drewmccormack/Forked/issues/5)
- Semantic Commit (2025) uses an LLM to detect and resolve *semantic* conflicts when updating intent specifications. It is analogous intent-level merging, applied to memory and specs rather than prose. — [arXiv 2504.09283](https://arxiv.org/pdf/2504.09283)
- Upwelling's finding that CRDT auto-merge handles syntax but humans must resolve semantic conflicts is the problem statement Co-Pen's rebase targets. — [Upwelling](https://www.inkandswitch.com/upwelling/)

### Inferences
- Co-Pen's recipe (base snapshot from `Y.snapshot` / captured text at job start, human version = current text, AI draft, then LLM 3-way merge constrained to preserve the human diff) matches the practitioner consensus. It adds (a) automatic detection through Yjs origin tracking and RelativePosition anchors, and (b) a **verifiable preservation check**: compute the human's base→human diff and assert every inserted or deleted token survives in the merged output. The code-merge literature shows LLMs sometimes drop or truncate content, which is exactly why such a check is needed.
- A strong evaluation design for judges: build a small set of synthetic concurrent-edit cases (a human fixes a typo, changes a name, adds a clause, or deletes a sentence while the AI rewrites) and compare:
  1. naive overwrite (lost-update rate);
  2. CRDT-only interleaving (garbled text);
  3. reconcile-text 3-way;
  4. LLM semantic rebase.

  Report the human-edit preservation rate and fluency. Even 30–50 cases would give a quantitative novelty result.
- Using reconcile-text (or diff-match-patch) as the *fallback* when the LLM output fails the preservation check makes the system robust. It also tells a clean "deterministic guard + LLM" story.

### Gaps
- I found no peer-reviewed paper that evaluates LLM 3-way merging of **natural-language prose** under concurrent human/AI editing. The evidence is limited to GitHub issues and library docs. Some 2026 arXiv numbers above come from search snippets and abstracts, not full-text reading.

## 5. Multiple AI agents editing the same document concurrently (multi-agent co-editing) and CRDT-based coordination between agents

### Takeaway
Multi-agent concurrent editing over CRDTs is only now appearing in research (Aug–Sep 2026 preprints). The main finding so far, from AgentRoom (code), is that **explicit coordination (claims, status, broadcast) does the work, not CRDT merging or parallelism by itself**. Co-Pen's parallel drafter and style-editor agents should include a lightweight coordination layer, such as paragraph claims through Yjs awareness, alongside CRDT merging. It is a timely contribution for prose.

### Cited Findings
- **AgentRoom (Cho & Lee; arXiv preprint, 24 Aug 2026).**
  - Concurrent multi-agent coding over a real-time CRDT editing protocol on a shared filesystem.
  - Exposes **file-level claim, status and broadcast as MCP tools**.
  - Tested with 5 frontier coding-CLI models on 4 backend tasks (Python DevBench, Rust+axum).
  - Results: two-agent AgentRoom abandoned fewer tasks than a solo agent, varied less between runs for stable models, and beat parallel-merge at matched compute.
  - Headline: "Coordination, not parallelism or CRDT-merge, bears the load."

  — [arXiv abs](https://arxiv.org/abs/2608.23740); [HF papers](https://huggingface.co/papers/2608.23740)
- **Lehmann et al. (CHI 2026)**: multiple users with multiple shared agents in a Yjs document. Agents act through comments and suggestions and are coordinated socially rather than algorithmically. — [arXiv 2509.11826](https://arxiv.org/abs/2509.11826)
- **DocuTeam (arXiv, Sep 2026)**: multiple agents react to an evolving document through discussion. They don't co-edit text concurrently. — [arXiv 2609.29309](https://arxiv.org/pdf/2609.29309)
- **Patchwork bots (2024)**: bots on branches, one at a time, with no concurrency between bots described. — [Patchwork notebook 07](https://www.inkandswitch.com/patchwork/notebook/2024-version-control/07/)
- Industry framing (vendor blog, low evidentiary weight) presents "agent teams" of specialized agents co-editing projects with humans in parallel. — [Taskade blog](https://www.taskade.com/blog/agent-teams-collaboration)

### Inferences
- Co-Pen's combination of (1) prose rather than code, (2) humans and multiple role agents all live in one CRDT text, (3) agents visible as cursor-bearing participants, (4) per-job undo and (5) semantic rebase on human interference does not appear in any single prior system I found. Individually, each piece has precedent: agents in a Yjs doc (Lehmann 2026), bots as branch collaborators (Patchwork 2024), CRDT multi-agent coordination (AgentRoom 2026), and selective undo (Prakash 1994 / Sun 2000).
- **The novelty argument to judges** should rest on the *integration and the concurrency-correctness guarantees*, not on "AI in a collaborative editor", which has been done. The "undo only AI" claim is not novel by itself either, since it is standard `trackedOrigins` usage. The strong claims are:
  1. a human's concurrent edit is never lost when an AI rewrite lands (semantic rebase with a verifiable preservation check);
  2. any AI job can be retracted independently, even after other agents and humans have edited around it;
  3. parallel role agents coordinate through claims and awareness, following AgentRoom's finding.
- Practical design implication from AgentRoom: add block-level "claim" metadata to Yjs awareness (agentId, role, paragraph RelativePosition range, status). The style editor then skips or queues paragraphs the drafter is writing, and humans see what each agent holds.

### Gaps
- AgentRoom and DocuTeam were read at the abstract level only. Their details (e.g., how claims are released, and the conflict rates) are unverified.
- I found no peer-reviewed study with quantitative results on multiple LLM agents editing the *same prose span* concurrently with humans.
- I found no product documentation (e.g., Google Docs Gemini, Notion AI, Microsoft Loop/Copilot) confirming multiple concurrent AI agents with presence cursors in one document. I did not search product docs in depth, so this is unconfirmed rather than a confirmed absence.
