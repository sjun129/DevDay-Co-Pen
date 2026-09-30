# Automation Bias & Over-reliance UI Design for AI Writing Suggestions (Co-Pen)

Scope note: Research compiled 2026-09-30 for Co-Pen (Yjs/TipTap real-time editor, AI agents insert tracked-change style suggestions; feature freeze 2026-10-18). Publication years are given for every source. Where a number could not be verified in the primary source, that is stated.

## Q1. Cognitive forcing functions (CFFs): do they reduce over-reliance, and what do they cost?

### Takeaway
CFFs (make the human think before/while seeing the AI answer) measurably reduce over-reliance compared with "show suggestion + explanation" designs, but they do not eliminate it, users rate them lowest (less preferred, more complex), and they mostly help people who already like effortful thinking. The designs that worked best were the ones users liked least.

### Cited Findings
- Buçinca, Malaya & Gajos (CSCW 2021, PACM HCI 5(CSCW1) Art.188): N=199 analyzed (260 recruited, MTurk), meal-carb-substitution task, simulated AI 75% accurate. Compared 3 CFFs vs 2 "simple explainable AI" (SXAI) baselines vs no-AI — [arXiv 2102.09692](https://arxiv.org/abs/2102.09692); [PDF (Harvard)](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - CFF designs: **On demand** (AI suggestion hidden until user clicks "See AI's suggestion"); **Update** (user commits an initial decision without AI, then sees AI and may revise); **Wait** ("AI is processing" for 30 s before the suggestion is shown). SXAI baselines: explanation shown immediately; explanation + "The AI is X% confident" shown only when uncertain — [PDF §3.2](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - On trials where the AI was wrong (carb-source detection): over-reliance (agreeing with wrong AI) **0.64 (SXAI) vs 0.48 (CFF)**, F=9.24, p=.003, d≈.36; correct decisions **0.08 vs 0.27**, p<.0001, d≈.66 — [PDF Table 2](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - For the full decision (ingredient + replacement), CFF produced significantly more correct decisions on wrong-AI trials (0.03 vs 0.09, d≈.37) but the over-reliance reduction was not significant — [PDF Table 2](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - No significant differences among the three CFFs, or between the two SXAI designs — [PDF §4.1](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - Even with CFFs, human+AI teams still performed worse than the AI alone: CFFs "reduced, but not yet eliminated, overreliance" — [PDF §5](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - Subjective cost: system rated significantly more complex under CFF (2.95) than SXAI (2.64) on 5-pt scale; trust (3.72 vs 3.91) and preference (3.62 vs 3.78) lower under CFF (not significant at category level). Trust and preference were **negatively** correlated with performance on wrong-AI trials; trust positively correlated with over-reliance — [PDF Table 3, §4.3](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - "People performed best in conditions that they preferred and trusted the least, and that they rated as the most difficult" — [PDF §5](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
  - Equity issue: CFFs benefited high Need-for-Cognition (NFC) participants more; low-NFC participants got little benefit — [arXiv abstract](https://arxiv.org/abs/2102.09692)
- Microsoft Aether synthesis on GenAI reliance (Passi, Dhanorkar, Vorvoreanu, Mar 2024, ~50 papers): CFF variants for GenAI include AI self-critiques (users found ~50% more mistakes in AI summaries, Saunders et al. 2022) and AI-posed critical questions next to claims (Danry et al. CHI 2023 improved detection of logically flawed claims). Caveat: CFFs can cause **under-reliance** by lowering perceived output quality and adding burden — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Same synthesis: "While it may be tempting to implement every strategy ... doing so can backfire ... due to an increase in associated cognitive load and friction"; experiment with different CFFs for experts vs novices — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Rastogi et al. (CSCW 2022, "Deciding Fast and Slow"): a time-based de-anchoring strategy reduced anchoring on AI; allocating more time when the AI has low confidence, together with an explanation, improved collaborative performance when the AI was low-confidence and wrong — [arXiv 2010.07938](https://arxiv.org/abs/2010.07938)

### Inferences
- A "30-second wait" style CFF is unacceptable UX for a live co-writing tool; "on demand" and "update" are the variants that translate to editing. An "update"-like pattern for writing = the human states intent/expected fact before seeing the AI's value.
- Because users dislike CFFs, uniform CFF on every suggestion will likely lead to workarounds (bulk accept, disabling agents). CFFs should be reserved for the subset of suggestions where errors are both likely and costly (see Q4).
- Low-motivation users (plausibly many students working to a deadline) benefit least from CFFs, so CFFs must be paired with non-cognitive levers (accountability, visibility to teammates — see Q5).

### Gaps
- No CFF study found in a multi-user, real-time co-writing setting; all evidence is single-user decision tasks or single-user LLM tasks.
- Buçinca's per-condition (on-demand vs update vs wait) numbers were not significantly different, so there is no evidence on which CFF variant is best.

## Q2. Do explanations increase or decrease over-reliance?

### Takeaway
Justification-style explanations ("here is why the AI chose this") tend to raise acceptance of AI output whether it is right or wrong. Explanations reduce over-reliance only when they make **checking** cheaper than solving the task yourself (verification-focused explanations, sources, contrastive evidence). Showing sources/citations is the explanation feature with the best evidence for lowering acceptance of wrong LLM outputs.

### Cited Findings
- Bansal et al. (CHI 2021, "Does the Whole Exceed its Parts?"): AI augmentation gave complementary gains, but state-of-the-art explanations did not add to them compared with just showing AI confidence; explanations "increase the chance that humans will accept the AI's recommendation, regardless of its correctness" — [UW PDF](https://idl.cs.washington.edu/files/2021-AIExplanationsTeamPerformance-CHI.pdf); [ACM DL](https://dl.acm.org/doi/fullHtml/10.1145/3411764.3445717)
- Vasconcelos et al. (CSCW 2023, "Explanations Can Reduce Overreliance on AI Systems During Decision-Making"): 731 participants, 5 studies, maze task. Cost-benefit framework: people weigh the cost of engaging with the task vs relying on AI. Task difficulty (Study 1) and explanation difficulty (Studies 2-3) changed over-reliance: explanations that are easy to verify reduce over-reliance; prior null results likely occurred because explanations did not reduce verification cost enough. Monetary incentives (Study 4) also shifted over-reliance — [arXiv 2212.06823](https://arxiv.org/abs/2212.06823)
- Kim, Vaughan, Liao, Lombrozo & Russakovsky (CHI 2025): pre-registered, N=308, LLM Q&A. "The presence of explanations increases reliance on both correct and incorrect responses"; reliance on incorrect responses decreased when **sources were provided** or when explanations contained **inconsistencies** — [arXiv 2502.08554](https://arxiv.org/abs/2502.08554); [ACM DL](https://dl.acm.org/doi/10.1145/3706598.3714020)
- Microsoft synthesis (2024): verification-focused explanations (Fok & Weld 2023) help users assess correctness rather than understand why AI produced output; contrastive explanations (evidence for and against) improved user accuracy ~20% in fact-checking where one-sided explanations were wrong (Si et al. 2023); background explanations cut agreement with incorrect outputs from 61% to 47% (Goyal et al. 2023) — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Same synthesis, caveat: users find verification-focused explanations convincing even when they contain contradictions and fabrications (Si et al. 2023); highlighting parts of explanations did not improve accuracy (Goyal et al. 2023) — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Same synthesis recommends pointing users to "relevant parts of GenAI inputs and outputs (e.g., 'Here are the tokens in your prompt based on which...')" and related sources — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Goddard et al. (JAMIA 2012): making decision-support reasoning transparent improved appropriate reliance; providing supportive **information** rather than a direct **recommendation**/command reduced over-use under time pressure — [PMC3240751](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/)

### Inferences
- In Co-Pen's planned explanation card, the three parts are not equally useful. "Which document paragraphs the AI used" is a **source** explanation (evidence it helps). "Why it chose that location" is a **justification** explanation (evidence it mostly raises acceptance). "Who requested it" is accountability metadata (useful for a different reason, see Q5).
- The source panel should show the exact supporting span next to the AI claim so the user can compare them directly. A bare list of paragraph IDs does not reduce verification cost.
- The card should also say what it **could not** ground ("No source in this doc for '2023년 47%'"). That works like the "inconsistency" signal that reduced reliance on wrong answers in Kim et al. 2025.

### Gaps
- Bansal et al. 2021 per-condition acceptance numbers could not be retrieved (ACM DL returned 403); only the abstract-level claim is cited.
- Vasconcelos et al. 2023 effect sizes per study were not retrieved (abstract only).

## Q3. Over-reliance specifically with LLM text / AI writing assistants, and uncertainty highlighting

### Takeaway
People do accept wrong LLM content. The evidence supports highlighting specific tokens or spans. Highlighting low-confidence facts in LLM answers more than doubled error detection in one study. For code, highlighting tokens that are likely to need edits helped, while raw generation-probability highlighting did not. LLM self-reported confidence is poorly calibrated. Writing assistants also shift what people write and believe, and fabricated citations are now common in real documents.

### Cited Findings
- Spatharioti et al. (arXiv 2023, "Comparing Traditional and LLM-based Search for Consumer Choice"): LLM users were faster and more satisfied but over-relied on incorrect information when the LLM erred. Experiment 2 (N=120, MTurk): on the task where the LLM was wrong, accuracy was **26% (no highlighting) vs 53% (low-confidence tokens highlighted red) vs 58% (red low + green high)**. Highlights came from GPT-3 token probabilities (≤50% = red). Treatment users spent more time on the error task (follow-up verification queries); satisfaction/perceived reliability did not differ significantly (3.7–4.2 / 3.8–4.1) — [arXiv HTML 2307.03744](https://arxiv.org/html/2307.03744)
- Vasconcelos et al. (ACM TOCHI, 2024/2025; arXiv 2023, "Generation Probabilities Are Not Enough"): N=30 programmers; highlighting tokens with highest **predicted likelihood of being edited** → faster completion, more targeted edits, preferred; highlighting by **generation probability** gave no benefit over no highlighting. Programmers wanted highlights to be granular, informative, interpretable, and not overwhelming — [arXiv 2302.07248](https://arxiv.org/abs/2302.07248)
- Microsoft synthesis: explain to users that uncertainty highlights "correlate but not necessarily equate with the likelihood of model errors"; a model's verbalized confidence "does not accurately reflect the correctness of its output" (poor calibration; LLMs also flip correct answers when challenged) — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Microsoft synthesis: GenAI's volume and fluency raise verification costs; users "treat the fluency, length, and speed of GenAI outputs as proxies for their accuracy". Novices need more reminders to verify. College students did not properly review Copilot suggestions and accepted incorrect ones (Prather et al. 2023). LLM ghostwriting produced anchoring (Chen & Chan 2023) — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Kim, Liao, Vorvoreanu, Ballard & Vaughan (FAccT 2024, "I'm Not Sure, But..."): N=404. First-person uncertainty ("I'm not sure, but...") reduced agreement with the system and over-reliance on incorrect answers, and increased accuracy. General-perspective phrasing ("It's not clear, but...") had weaker, non-significant effects. The exact wording matters — [arXiv 2405.00623](https://arxiv.org/abs/2405.00623)
- Microsoft synthesis caveat: first-person uncertainty lowers trust and lengthens task time; efficacy of epistemic markers "may differ across contexts, cultures, and languages" — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)
- Liu et al. (CHI 2026, "Behavioral Indicators of Overreliance..."): 77 participants, LLM seeded with plausible misinformation across quiz, summarization, trip-planning tasks. High-over-reliance users showed frequent whole-paragraph copy-paste, skipping comprehension, repeated LLM referencing, coarse locating, and **accepting misinformation despite hesitation**. Low-over-reliance users showed careful comprehension and fine-grained navigation — [arXiv 2602.11567](https://arxiv.org/abs/2602.11567); [ACM DL](https://dl.acm.org/doi/10.1145/3772318.3790332)
- Welzel & Vincent (FAccT 2026): N=47 analysis/synthesis writing assignments; textual overlap between AI suggestions and final text showed suggestion-reuse patterns. They proposed a reflective interface that shows how AI output is incorporated; it was tested only in a small think-aloud (n=4) — [arXiv 2605.15322](https://arxiv.org/abs/2605.15322)
- Jakesch et al. (CHI 2023, "Co-Writing with Opinionated Language Models Affects Users' Views"): N=1,506 writers. An opinionated writing assistant shifted the opinions expressed in participants' writing and their later survey attitudes — [arXiv 2302.00560](https://arxiv.org/abs/2302.00560)
- Zhao et al. (arXiv May 2026): audit of 111M references in 2.5M papers (arXiv, bioRxiv, SSRN, PMC). Conservative estimate is **146,932 hallucinated citations in 2025**, a sharp rise after LLM adoption, concentrated among early-career researchers. Moderation and peer review catch only a fraction — [arXiv 2605.07723](https://arxiv.org/abs/2605.07723)

### Inferences
- Co-Pen's idea of flagging numbers, dates, proper nouns and citations matches the evidence: span-level, granular, actionable highlights. It is closer to "likely-to-need-editing" highlighting (useful) than to raw token-probability highlighting (no benefit for code). Entity-type flags are deterministic and cheap to build, so they avoid the calibration problem of LLM self-confidence.
- Flags could be made more informative by checking each flagged entity against the team's own documents or sources: string/number match means grounded, no match means unverified. This behaves like an "edit-likelihood" signal and is cheap to implement.
- Citations are the highest-value flag class for student assignments, given the 2025 surge in fabricated references in real papers.
- The Liu et al. 2026 behaviours (whole-paragraph accept, coarse locating) suggest that Co-Pen's own logs can detect rubber-stamping, e.g. accepting a long suggestion within less than N seconds of it appearing.
- Korean-language uncertainty phrasing (e.g., "확실하지 않지만…" vs "문서에서 근거를 찾지 못했어요") has not been validated. Keep the wording first-person and specific to the flagged item.

### Gaps
- No peer-reviewed study found that tests entity-type (number/date/name/citation) flagging in a writing editor specifically; the closest evidence is Spatharioti (factual QA) and Vasconcelos (code).
- No Korean-language or Korean-student studies on AI over-reliance UI were found in this search.
- Jakesch et al. effect sizes were not retrieved (abstract only).

## Q4. Selective (risk-proportional) friction vs uniform friction

### Takeaway
Direct head-to-head experiments of selective vs uniform friction for AI suggestions are sparse. The indirect evidence clearly favours selective friction. Repeated, low-signal alerts are overridden reflexively and habituate quickly. Confidence-conditional time or friction improved outcomes in the cases where the AI was low-confidence. Industry guidelines tie explanation depth to stakes.

### Cited Findings
- van der Sijs et al. (JAMIA 2006 review): clinicians override drug-safety alerts in **49–96%** of cases; main cause is alert fatigue from poor signal-to-noise (not serious, irrelevant, or repeated alerts) — [AHRQ summary](https://digital.ahrq.gov/health-it-tools-and-resources/health-it-costs-and-benefits-database/overriding-drug-safety-alerts); [PDF](https://interruptions.net/literature/Sijs-JAmMedInformAssoc06.pdf)
- Ancker et al. (BMC Med Inform Decis Mak 2017): 112 clinicians, >1.2M best-practice alerts and 326K drug alerts. Acceptance dropped **30% for each additional reminder per encounter** and 10% per 5-point rise in the share of repeated reminders. After overriding the first instance of a repeated alert, clinicians overrode later instances with **87.9%** probability. Evidence supported cognitive overload rather than pure desensitization — [PMC5387195](https://pmc.ncbi.nlm.nih.gov/articles/PMC5387195/)
- Security-warning habituation: fMRI showed a large drop in visual processing after the second exposure to a warning. Polymorphic warnings (whose appearance changes) resist habituation — [Anderson et al., CHI 2015 (ACM DL)](https://dl.acm.org/doi/10.1145/2702123.2702322). A 3-week field study reported 76% adherence with polymorphic warnings vs 55% with static ones (Vance et al., MIS Quarterly 2018); this figure comes from a search summary and could not be verified in full text — [ResearchGate](https://www.researchgate.net/publication/325361021_Tuning_Out_Security_Warnings_A_Longitudinal_Examination_of_Habituation_Through_fMRI_Eye_Tracking_and_Field_Experiments1)
- Rastogi et al. (CSCW 2022): allocating decision time by AI confidence, with explanation, de-anchored users and improved performance when the AI was low-confidence and wrong — [arXiv 2010.07938](https://arxiv.org/abs/2010.07938)
- Sargeant, Jorgensen, Shah, Goring, Weller & Bhatt (ECAF 2026, "Unequal Uncertainty"): define **selective friction** as presenting high-uncertainty predictions together with salient uncertainty warnings, instead of withholding them. They state that whether selective friction improves decision quality in practice "is uncertain" and identify conditions under which it may help or hurt — [arXiv 2508.07872](https://arxiv.org/abs/2508.07872)
- Goddard et al. (2012): **dynamic**, per-recommendation confidence levels (vs a fixed system-wide reliability statement) improved calibration — [PMC3240751](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/)
- Google PAIR Guidebook ("Explainability + Trust"): scale explanation to stakes. Detailed "why" is for high-stakes moments and may be unnecessary for routine tasks. Categorical confidence (high/medium/low) should "clearly indicate required user action per category". Skip confidence displays that don't change decisions — [PAIR chapter](https://pair.withgoogle.com/chapter/explainability-trust/)
- Microsoft HAX Guidelines (Amershi et al., CHI 2019): G8 "Support efficient dismissal", G9 "Support efficient correction", G10 "Scope services when in doubt" — [HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)

### Inferences
- If every AI suggestion carried a mandatory "I checked this" gate, the clinical-alert data (30% acceptance decay per extra reminder; 88% repeat override) predict that it would turn into a reflex click. Keep the gate rare so it stays meaningful. Aim for a small number of gated items per suggestion, and only for entities the system could not ground in the team's documents.
- Three tiers map cleanly onto the evidence:
  - **Tier 0**: style or rephrasing with no new facts. One-click accept or reject (HAX G8/G9).
  - **Tier 1**: new facts that were found in the linked sources. Highlight them and show the source span. One-click accept.
  - **Tier 2**: facts not found in any source, and all citations. Blocking verification action required.
- To reduce habituation, vary the Tier-2 interaction by entity type. A citation asks for the link/DOI to be opened, a number shows the source value next to the AI value, and a name asks to confirm the spelling in the source. Do not use one identical checkbox for everything.

### Gaps
- No controlled experiment was found that compares selective vs uniform friction on AI writing suggestions. The recommendation above is inferred from the clinical-alert, security-warning, and confidence-conditional studies.
- Vance et al. 2018's 76% vs 55% figures could not be checked against full text (403).

## Q5. Automation bias mechanisms in human-in-the-loop systems (Parasuraman & Manzey 2010; Goddard et al. 2012)

### Takeaway
Automation bias is mainly an attention-allocation problem that gets worse under workload, time pressure, and miscalibrated trust. It shows up as commission errors (following wrong advice) and omission errors (missing problems the aid did not flag). Practice alone does not cure it. Accountability, training, less prominent "command-style" advice, and per-item dynamic confidence are the documented mitigators.

### Cited Findings
- Parasuraman & Manzey (Human Factors 52(3):381–410, 2010): complacency and automation bias are overlapping, attention-driven phenomena. Complacency arises under multiple-task load when manual tasks compete for attention. It occurs in both novices and experts and "cannot be overcome with simple practice". Imperfect aids produce both **omission** and **commission** errors — [SAGE](https://journals.sagepub.com/doi/10.1177/0018720810376055); [TU Berlin repository](https://depositonce.tu-berlin.de/bitstreams/cafd2873-814b-4c59-bab1-addd42e249d2/download)
- Goddard, Roudsari & Wyatt (JAMIA 19(1), 2012), systematic review of 74 studies: "negative consultations" (correct decision switched to incorrect after advice) occurred in 6–11% of cases across studies. Meta-analysis: with erroneous advice, users were **26% more likely** to make an incorrect decision than controls (RR 1.26, 95% CI 1.11–1.44) — [PMC3240751](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/)
- Goddard et al. mediators: task inexperience, low confidence in one's own judgement, workload, time pressure, task complexity, and miscalibrated trust ("possibly the strongest driving factor"). Mitigators: training, increased **user accountability**, transparent reasoning, less prominent advice placement, dynamic per-item confidence, information rather than recommendation, status rather than command displays — [PMC3240751](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/); [PubMed](https://pubmed.ncbi.nlm.nih.gov/21685142/)
- Passi & Vorvoreanu (Microsoft Research tech report MSR-TR-2022-12, June 2022): define over-reliance as users accepting incorrect AI outputs. Over-reliance leads to errors and eventually lost trust — [Microsoft Research](https://www.microsoft.com/en-us/research/publication/overreliance-on-ai-literature-review/)
- Microsoft 2024 synthesis: appropriate reliance has two parts, Correct AI Reliance (accept when right) and Correct Self-Reliance (reject when wrong), plus the Appropriateness-of-Reliance metric (Schemmer et al. 2023). It notes GenAI output is often partially correct, which breaks all-or-nothing accept/reject framing — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)

### Inferences
- Students on a deadline in a shared document have high workload and time pressure, and they split attention across co-authors' cursors and chat. These are exactly the conditions Parasuraman & Manzey and Goddard link to automation bias.
- **Omission errors** matter as much as commission errors. If Co-Pen flags only numbers, dates, names and citations, users may treat everything unflagged as safe. Mitigation: a persistent note ("표시되지 않은 내용도 AI가 작성했습니다") and visual marking of all AI-authored text until a human edits or accepts it.
- **Accountability** is the mitigator that fits a team tool best and costs little to build. Record and show "verified by [name]" on each Tier-2 item, and show an unverified-AI-content count per section on a team panel. This uses social accountability instead of relying on each individual's need for cognition.
- AI edits are often partly correct, so supporting "accept with edit" (edit inside the suggestion before accepting) matters. It also counts as real engagement, unlike a binary accept.

### Gaps
- No studies found on automation bias where the "automation" is a visible peer-like agent with its own cursor in a multi-human team. It is unknown whether anthropomorphic presence increases or decreases over-reliance in this setting.

## Q6. Industry guidelines (Microsoft HAX, Google PAIR) relevant to showing AI suggestions and verification

### Takeaway
Both guideline sets support the parts of Co-Pen's design that make AI suggestions easy to scope, dismiss and correct, stakes-sensitive, source-attributed, and honest about fallibility. PAIR specifically warns against numeric confidence for non-expert users and recommends categorical states with a clear required action.

### Cited Findings
- HAX 18 guidelines (Amershi et al., CHI 2019), relevant ones: G1 make clear what the system can do; **G2 make clear how well the system can do what it can do**; G4 show contextually relevant information; G8 support efficient dismissal; **G9 support efficient correction**; G10 scope services when in doubt; **G11 make clear why the system did what it did**; G15 encourage granular feedback; G16 convey the consequences of user actions — [HAX Toolkit](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/); [Microsoft Research](https://www.microsoft.com/en-us/research/publication/guidelines-for-human-ai-interaction/)
- HAX design-library example (Viva Topics): pairs G9 (switchable classification decisions) with G2 ("Did we get it right?" prompt signalling the AI can err) — [HAX example](https://www.microsoft.com/en-us/haxtoolkit/example/viva-topics-g9-a-switch-classification-decisions-2/)
- PAIR "Explainability + Trust": articulate data sources. Tie explanations to user actions. Use partial explanations with progressive disclosure. Categorical confidence should state the required user action. N-best alternatives in low-confidence cases prompt users "to rely on their own judgement". Numeric percentages are risky for users without a probability baseline. Tell users that predictions "could be wrong" — [PAIR chapter](https://pair.withgoogle.com/chapter/explainability-trust/)
- Microsoft 2024 GenAI synthesis design guidance: (1) be transparent about capabilities and limits, including in onboarding; (2) provide relevant, evidence-pointing explanations; (3) convey uncertainty linguistically and visually, but note that highlights ≠ error probability; (4) use CFFs selectively; test in context because strategies "can backfire" — [Microsoft Research PDF](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/03/GenAI_AppropriateReliance_Published2024-3-21.pdf)

### Inferences
- Use PAIR's categorical-state guidance directly for the flag chips: `근거 확인됨` (grounded, click to view source), `근거 없음 · 확인 필요` (not grounded, action required), `인용 확인 필요` (citation, open link). Each state has one clear action. Do not show a "87% confident" number.
- Progressive disclosure for the explanation card: show the source-span comparison first, and fold "who requested / why this location" into a secondary line.

### Gaps
- Neither guideline set addresses multi-user settings, i.e. who in a team is responsible for verifying an AI suggestion that another member requested.

## Q7. Actionable implications for the Co-Pen design (synthesis for the hackathon scope)

### Takeaway
Keep the core idea: entity-type verification flags plus an explanation card. Change three things. (1) Make the friction risk-proportional by grounding each flagged entity against the team's sources, and gate only the ungrounded ones and citations. (2) Make the explanation card a source-comparison view, not a justification. (3) Replace the generic "I checked this" checkbox with type-specific verification actions and visible, attributed accountability.

### Cited Findings (evidence each recommendation rests on)
- Span-level highlighting of likely-wrong facts more than doubled detection of LLM errors (26% → 53–58%) without hurting satisfaction — [Spatharioti et al. 2023](https://arxiv.org/html/2307.03744)
- Highlights must be actionable and match where edits are actually needed; raw generation-probability highlights gave no benefit in code — [Vasconcelos et al. TOCHI](https://arxiv.org/abs/2302.07248)
- Sources reduce reliance on wrong LLM answers; explanations alone raise reliance on both right and wrong answers — [Kim et al. CHI 2025](https://arxiv.org/abs/2502.08554); [Bansal et al. CHI 2021](https://idl.cs.washington.edu/files/2021-AIExplanationsTeamPerformance-CHI.pdf)
- Explanations help only when they lower verification cost — [Vasconcelos et al. CSCW 2023](https://arxiv.org/abs/2212.06823)
- CFFs work but are disliked and help high-NFC users most — [Buçinca et al. 2021](https://www.eecs.harvard.edu/~kgajos/papers/2021/bucinca21trust.pdf)
- Repeated alerts decay fast (−30% acceptance per extra alert; 87.9% repeat override) — [Ancker et al. 2017](https://pmc.ncbi.nlm.nih.gov/articles/PMC5387195/)
- Accountability and information-over-command displays mitigate automation bias — [Goddard et al. 2012](https://pmc.ncbi.nlm.nih.gov/articles/PMC3240751/)
- First-person, specific uncertainty wording reduces over-reliance — [Kim et al. FAccT 2024](https://arxiv.org/abs/2405.00623)
- Whole-paragraph copy/accept and coarse navigation are behavioural markers of over-reliance — [Liu et al. CHI 2026](https://arxiv.org/abs/2602.11567)
- Fabricated citations surged in real 2025 papers — [Zhao et al. 2026](https://arxiv.org/abs/2605.07723)

### Inferences (concrete design decisions, in priority order for a freeze on 2026-10-18)
1. **Tiered suggestions (must-have).** When an agent's suggestion is created, run a deterministic extractor to find numbers, dates, proper nouns and citation-like strings. Regex covers numbers, dates and URL/DOI/`(저자, 연도)` patterns; proper nouns can use a simple NER or a second LLM call. Compare each entity with the source paragraphs the agent used, via exact or normalized match.
   - Tier 0: no entities. One-click accept.
   - Tier 1: all entities grounded. Soft highlight and one-click accept.
   - Tier 2: any ungrounded entity or any citation. Gated.
   This keeps gates rare, so they are less likely to become reflex clicks (Ancker 2017; van der Sijs 2006).
2. **Type-specific verification actions instead of a generic checkbox (must-have).**
   - Number or date: show "AI 값 vs 원문 값" side by side, or "원문에 없음".
   - Citation: the accept button unlocks only after the user opens the link/DOI, or chooses "출처 없음 → 삭제/표시".
   - Proper noun: show the source spelling.
   Offer four options: `확인함` / `수정 후 수락` / `거절` / `[확인 필요] 태그로 남기기`. The last option lets users defer without rubber-stamping. The gate works on the specific flagged item, like Buçinca's "on demand" CFF, not on the whole suggestion.
3. **Block bulk "Accept all" for Tier-2 items (must-have).** "Accept all" accepts only Tier 0 and Tier 1 and leaves Tier-2 items pending with a count. This removes the easiest route to rubber-stamping, the whole-paragraph accept marker in Liu et al. 2026.
4. **Explanation card = source comparison first (must-have).** The primary line shows the source paragraph(s) with the supporting span highlighted, plus an explicit "근거를 찾지 못한 항목: …" list. "Who requested" and "why this location" go on a secondary, collapsed line. The why-location rationale is a justification explanation, and Bansal and Kim find that type increases acceptance regardless of correctness.
5. **Visible accountability (should-have).** Stamp each Tier-2 decision with the verifier's name and time in the Yjs doc metadata, and show "✔ 민지가 확인" on hover. Add a per-section or document badge: "AI 작성 · 미검증 항목 3". Before export or submission, show a checklist of unverified or deferred items. This relies on the accountability mitigator (Goddard 2012) rather than on individual motivation (the NFC problem in Buçinca 2021).
6. **Mark AI authorship persistently to counter omission errors (should-have).** Keep a subtle AI-authorship underline or gutter mark on accepted AI text until a human edits it. Onboarding should say "표시되지 않은 문장도 AI가 틀릴 수 있음" (HAX G2; Parasuraman & Manzey on omission errors).
7. **Uncertainty copy in Korean, first-person and item-specific (should-have).** Example: "제가 참고한 문서에서 이 수치(47%)를 찾지 못했어요. 확인 후 수락해 주세요." Do not use LLM-self-reported percentages (poorly calibrated; PAIR advises against numeric confidence for lay users).
8. **Optional "update"-style CFF for high-stakes requests (nice-to-have, likely out of scope).** When a user asks the agent for a factual paragraph, prompt "예상하는 핵심 수치/출처가 있나요?" before generation. This follows Buçinca's "update" condition. Make it skippable, because CFFs are disliked.
9. **Instrumentation for the demo/evaluation (should-have, cheap).** Log time from suggestion render to accept, source-panel open rate, Tier-2 defer/reject rates, and accept-with-edit rate. For the hackathon demo, run a seeded-error "drill": plant one wrong number and one fake citation in an agent suggestion and show that the UI catches them. Report correct self-reliance, i.e. rejection of wrong items (Schemmer et al. metrics via the Microsoft 2024 synthesis). Related concept: [reliance drills, arXiv 2409.14055](https://arxiv.org/html/2409.14055v3) (title-level only; not reviewed in detail here).
10. **Avoid:** forced wait timers (the 30 s "wait" CFF is disliked and slows a live editor); one identical warning modal for every suggestion (habituation); a "why I chose this" rationale as the headline of the card; numeric confidence badges.

### Gaps
- None of the recommendations above has been tested in a real-time multi-user co-editor with AI agents as cursor-bearing participants. They are extrapolations and should be validated with a small in-team pilot (even 5–8 students) before the freeze.
- Grounding-by-string-match will miss paraphrased or reformatted numbers (e.g., "47%" vs "절반에 가까운"; "2023년" vs "작년") and may give false "grounded" states when the same number appears in an unrelated context. The false-positive/negative rates of this heuristic are unknown and should be spot-checked.
- No evidence was found on whether Korean university students differ in over-reliance or in their response to friction.
