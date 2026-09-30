# AI 위험관리·신뢰성 프레임워크와 Co-Pen 기능 매핑 (Trust Frameworks → Feature → Evidence/Metric)

Research date: 2026-09-30. Scope: NIST AI RMF 1.0 + GenAI Profile (AI 600-1), ISO/IEC 42001 / 23894, OECD AI Principles (2024), UNESCO Recommendation, Korea (인공지능 윤리기준, TTA 개발안내서, 인공지능기본법), EU AI Act Annex III, and measurement/TEVV guidance.
Note on method: NIST AI 600-1 action IDs and text below were extracted directly from the official PDF (text-extracted locally), so IDs/quotes are verbatim. Some law texts (EU Art. 6(3), Korean Act Art. 2(4) exact education wording) could not be fetched verbatim in this session and are flagged.

---

## Q1. NIST AI RMF 1.0 (Govern/Map/Measure/Manage) and Generative AI Profile (NIST AI 600-1): which subcategories/actions correspond to Co-Pen features? Any 2025–2026 updates?

### Takeaway
NIST AI 600-1 (July 2024) defines 12 GAI risks; four map directly to Co-Pen — **Confabulation, Information Integrity, Human-AI Configuration, Information Security** (prompt injection) — and it has concrete, citable action IDs for almost every planned feature (deactivation → pause, override tracking → undo, source/citation verification → "verification needed" flags, red-teaming against prompt injection, provenance/lineage → provenance marks + audit log). As of Sept 2026 NIST has **not** released an "AI RMF 2.0"; the 1.0 framework is being revised and supplemented with profiles/drafts.

### Cited Findings

**Framework structure & the 12 GAI risks (AI 600-1)**
- AI 600-1 is a cross-sectoral profile/companion to AI RMF 1.0 for generative AI; the GAI Public Working Group focused on four "primary considerations": **Governance, Pre-Deployment Testing, Content Provenance, and Incident Disclosure**, "relevant for voluntary use by any organization designing, developing, and using GAI" — [NIST AI 600-1 PDF, Appendix A](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- The 12 GAI risks: CBRN Information or Capabilities; Confabulation; Dangerous, Violent, or Hateful Content; Data Privacy; Environmental Impacts; Harmful Bias or Homogenization; Human-AI Configuration; Information Integrity; Information Security; Intellectual Property; Obscene, Degrading, and/or Abusive Content; Value Chain and Component Integration — [NIST AI 600-1 §2](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **Confabulation** definition: "The production of confidently stated but erroneous or false content (known colloquially as 'hallucinations' or 'fabrications') by which users may be misled or deceived." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **Human-AI Configuration** definition: "Arrangements of or interactions between a human and an AI system which can result in the human inappropriately anthropomorphizing GAI systems or experiencing algorithmic aversion, automation bias, over-reliance, or emotional entanglement with GAI systems." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **Information Integrity** definition: "Lowered barrier to entry to generate and support the exchange and consumption of content which may not distinguish fact from opinion or fiction or acknowledge uncertainties, or could be leveraged for large-scale dis- and mis-information campaigns." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **Information Security** risk includes lowered barriers for offensive cyber capabilities; prompt injection is named under MS-2.7-007 (below) — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

**Subcategories (AI RMF 1.0 wording, as reproduced in AI 600-1) and specific actions, verbatim, mapped to Co-Pen features**

*Global pause / kill switch / AI no-touch zones*
- GOVERN 1.7: "Processes and procedures are in place for decommissioning and phasing out AI systems safely…"; **GV-1.7-001**: "Protocols are put in place to ensure GAI systems are able to be deactivated when necessary." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MANAGE 2.4: "Mechanisms are in place and applied, and responsibilities are assigned and understood, to supersede, disengage, or deactivate AI systems that demonstrate performance or outcomes inconsistent with intended use." **MG-2.4-001**: establish communication plans for "the deactivation or disengagement process of a specific GAI system … or context of use, including reasons, workarounds, user access removal, alternative processes…"; **MG-2.4-002** (escalation to "organizational risk management authority when specific criteria for deactivation or disengagement is met for a particular context of use") — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- GOVERN 3.2: "Policies and procedures are in place to define and differentiate roles and responsibilities for human-AI configurations and oversight of AI systems." **GV-3.2-003**: "Define acceptable use policies for GAI interfaces, modalities, and human-AI configurations…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*Suggestion-only edits, AI-only / per-job selective undo, preserving human edits (human override)*
- MANAGE 4.1: "Post-deployment AI system monitoring plans are implemented, including mechanisms for capturing and evaluating input from users…, **appeal and override**, decommissioning, incident response, recovery, and change management." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MS-4.2-004**: "Monitor and document instances where human operators or other systems override the GAI's decisions. Evaluate these cases to understand if the overrides are linked to issues related to content provenance." (→ log suggestion reject/undo events and analyze them) — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MP-3.4-005**: "Implement systems to continually monitor and track the outcomes of human-GAI configurations for future refinement and improvements." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MG-3.2-008**: "Use human moderation systems where appropriate to review generated content in accordance with human-AI configuration policies established in the Govern function…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*Provenance marks, append-only audit log*
- **MP-3.4-001**: "Evaluate whether GAI operators and end-users can accurately understand content lineage and origin." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MG-2.2-007**: "Use real-time auditing tools where they can be demonstrated to aid in the tracking and validation of the lineage and authenticity of AI-generated data." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **GV-1.6-003** (inventory entries should include "Data provenance information (e.g., source, signatures, versioning, watermarks); Known issues…; Human oversight roles and responsibilities…") — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MP-5.1-001**: "Apply TEVV practices for content provenance (e.g., probing a system's synthetic data generation capabilities…)" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*AI usage disclosure export*
- **GV-5.1-002**: "Document interactions with GAI systems to users prior to interactive activities, particularly in contexts involving more significant risks." (tagged Human-AI Configuration; Confabulation) — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MEASURE 2.8: "Risks associated with transparency and accountability – as identified in the MAP function – are examined and documented." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*"Verification needed" flags on AI-introduced facts (confabulation)*
- MEASURE 2.5: "The AI system to be deployed is demonstrated to be valid and reliable. Limitations of the generalizability beyond the conditions under which the technology was developed are documented." **MS-2.5-003**: "Review and verify sources and citations in GAI system outputs during pre-deployment risk measurement and ongoing monitoring activities." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MG-4.1-002**: "Establish, maintain, and evaluate effectiveness of organizational processes and procedures for post-deployment monitoring of GAI systems, particularly for potential confabulation, CBRN, or cyber risks." **MG-4.1-004**: "Implement active learning techniques to identify instances where the model fails or produces unexpected outputs." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*Explanation cards*
- MEASURE 2.9: "The AI model is explained, validated, and documented, and AI system output is interpreted within its context … to inform responsible use and governance." **MS-2.8-004**: "Verify adequacy of GAI system user instructions through user testing." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*Prompt-injection defenses + red-team test set*
- MEASURE 2.7: "AI system security and resilience … are evaluated and documented." **MS-2.7-007**: "Perform AI red-teaming to assess resilience against: Abuse to facilitate attacks on other systems…, GAI attacks (e.g., prompt injection), ML attacks (e.g., adversarial examples/prompts, data poisoning…)." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MP-5.1-005**: "Conduct adversarial role-playing exercises, GAI red-teaming, or chaos testing to identify anomalous or unforeseen failure modes." **GV-3.2-005**: "Engage in threat modeling to anticipate potential risks from GAI systems." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*Benchmark harness / metrics*
- MEASURE 2.3: "AI system performance or assurance criteria are measured qualitatively or quantitatively and demonstrated for conditions similar to deployment setting(s). Measures are documented." **MS-2.3-002**: "Evaluate claims of model capabilities using empirically validated methods." **MS-2.3-003**: "Share results of pre-deployment testing with relevant GAI Actors…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- **MS-2.5-001**: "Avoid extrapolating GAI system performance or capabilities from narrow, non-systematic, and anecdotal assessments." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MEASURE 2.13: "Effectiveness of the employed TEVV metrics and processes in the MEASURE function are evaluated and documented." **MS-2.13-001**: assess "construct validity for each metric (i.e., does the metric effectively operationalize the desired concept)…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

*User feedback / impact on students*
- GOVERN 5.1 (collect/integrate external feedback); **GV-3.2-004**: "Establish policies for user feedback mechanisms for GAI systems which include thorough instructions and any mechanisms for recourse." **MP-3.4-006**: involve end-users "in prototyping and testing activities." **MG-2.2-008**: "Use structured feedback mechanisms to solicit and capture user input about AI-generated content…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)

**2025–2026 NIST updates**
- NIST's AI RMF landing page remains the canonical source for AI RMF 1.0, Playbook and profiles — [NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework)
- On 2026-04-07 NIST published a concept note for an "AI RMF Profile on Trustworthy AI in Critical Infrastructure" — [NIST concept note page](https://www.nist.gov/programs-projects/concept-note-ai-rmf-profile-trustworthy-ai-critical-infrastructure); [PDF](https://www.nist.gov/system/files/documents/2026/04/08/Concept%20Note_%20Development%20of%20the%20NIST%20AI%20RMF%20Trustworthy%20Use%20of%20AI%20in%20Critical%20Infrastructure%20Profile.pdf)
- Secondary sources report AI RMF 1.0 is being revised under the White House AI Action Plan but no "AI RMF 2.0" has been released; they also report a July 29, 2026 initial public draft "Guidance and Templates for Public-Facing AI Documentation: An AI Standards 'Zero Draft'" (comments to Sept 16, 2026) and ongoing Cyber AI Profile / SP 800-53 AI control overlays — [I.S. Partners blog (secondary)](https://www.ispartnersllc.com/blog/nist-ai-rmf-2025-2026-updates-what-you-need-to-know-about-the-latest-framework-changes/); [NIST AI Standards page](https://www.nist.gov/artificial-intelligence/ai-standards)

### Inferences
- The strongest NIST-anchored claims for Co-Pen are: pause/no-touch zones → GOVERN 1.7 / MANAGE 2.4 (GV-1.7-001, MG-2.4-001); undo & suggestion-only → MANAGE 4.1 "appeal and override" + MS-4.2-004; verification flags → MS-2.5-003 + MG-4.1-002 (Confabulation); provenance/audit log → MP-3.4-001, MG-2.2-007 (Information Integrity); red-team set → MS-2.7-007 (explicitly names prompt injection); benchmark harness → MS-2.3-002, MS-2.5-001, MS-2.13-001.
- Framing language: "Co-Pen implements product-level controls **informed by** NIST AI 600-1 suggested actions X, Y, Z" — AI RMF is voluntary and not certifiable, so "NIST-compliant" is not a meaningful or safe claim.
- Organizational actions (GOVERN: policies, roles, incident-response plans) are only partially addressable by a student team; the team can show a lightweight version (e.g., one-page acceptable-use policy, named owner for incident response).
- For the Korean pitch, NIST subcategory names can be rendered as: 거버넌스(GOVERN)·맥락파악(MAP)·측정(MEASURE)·관리(MANAGE); 위험명 예: 작화(Confabulation, 환각), 정보 무결성, 인간-AI 구성(과의존·자동화 편향), 정보 보안.

### Gaps
- Could not verify on nist.gov itself the July 2026 "Zero Draft" on public-facing AI documentation or the status of an AI RMF revision; only secondary sources. Treat as "reported".
- Did not check whether the NIST AI RMF Playbook has 2025–2026 revisions.

---

## Q2. ISO/IEC 42001 and ISO/IEC 23894 — what's relevant for a product team vs. organization-level?

### Takeaway
ISO/IEC 42001 is an **organization-level, certifiable AI management system (AIMS)** standard; ISO/IEC 23894 is **guidance** on AI risk management (applying ISO 31000 to AI) and is usable at product/service level. Korea's TTA runs an AI-trust certification (CAT) that explicitly splits these: 23894 → product/service risk management track; 42001 → organization management-system track. A small team should cite 23894-style risk process and avoid any 42001 "certification" language.

### Cited Findings
- TTA's AI trustworthiness certification (CAT) has four tracks: **(제품·서비스) AI 위험관리** aligned with ISO/IEC 23894; **(제품·서비스) AI 신뢰성 확보 조치** aligned with ISO/IEC TR 24028; **(조직) AI 경영시스템** per ISO/IEC 42001; **(조직) AI 사용 거버넌스** per ISO/IEC 38507 — [TTA CAT GitBook 일러두기](https://tta-trustworthy-ai.gitbook.io/cat); [CAT – ISO/IEC 23894(제품·서비스)](https://tta-trustworthy-ai.gitbook.io/cat/cat-2.0/aisystem); [CAT – (제품·서비스) AI 위험관리](https://tta-trustworthy-ai.gitbook.io/cat/cat/aisystem); [CAT – (조직) AI 거버넌스](https://tta-trustworthy-ai.gitbook.io/cat/cat/aiuser)
- The TTA risk-management requirement ("요구사항 1. 인공지능 시스템에 대한 위험관리 계획 및 수행") describes a process of risk identification across development, operation, use and disposal stages, risk analysis (likelihood × impact to prioritize), and risk evaluation/continuous improvement, with documentation — [TTA CAT 요구사항 1](https://tta-trustworthy-ai.gitbook.io/cat/cat-1.0/1.)
- ISO's official page for ISO/IEC 42001 (fetch blocked, HTTP 403 in this session) — [ISO/IEC 42001](https://www.iso.org/standard/42001); ISO/IEC 23894 page — [ISO/IEC 23894](https://www.iso.org/standard/77304.html)

### Inferences
- Product-team-relevant pieces: (a) a documented risk register for Co-Pen's AI features following identify → analyze → evaluate → treat → monitor (23894/ISO 31000 logic, also TTA 요구사항 1); (b) an "AI system impact assessment" note (a concept 42001 also uses) covering students' grades/academic integrity; (c) traceability/change history (TTA 요구사항 4).
- Organization-level pieces that a student team should NOT claim: an AIMS, management review, internal audit program, 42001 certification.
- Safe phrasing: "ISO/IEC 23894의 위험관리 절차를 참고한 제품 수준 위험 레지스터" rather than "ISO 42001 준수/인증".

### Gaps
- Could not fetch iso.org (403); from background knowledge (not verified this session): ISO/IEC 42001 was published Dec 2023, follows the ISO harmonized management-system structure (PDCA), and includes an Annex A of controls including AI system impact assessment; ISO/IEC 23894 was published 2023 as guidance based on ISO 31000. The report-writer should phrase these as general descriptions or verify on iso.org.

---

## Q3. OECD AI Principles (2024 update) and UNESCO Recommendation — citable principles

### Takeaway
OECD (adopted 2019, updated May 2024) has 5 values-based principles; the 2024 update added to 1.4 that AI systems can be "overridden, repaired, and/or decommissioned safely by human interaction" and added information-integrity language — a near-perfect citation for Co-Pen's pause/undo features. UNESCO (Nov 2021, 193 Member States) lists 10 principles including "Human oversight and determination" and "Transparency and explainability".

### Cited Findings
**OECD**
- Five values-based principles: (1) Inclusive growth, sustainable development and well-being; (2) Human rights and democratic values, including fairness and privacy; (3) Transparency and explainability; (4) Robustness, security and safety; (5) Accountability. Adopted May 2019, updated May 2024 — [OECD.AI – AI Principles](https://oecd.ai/en/ai-principles); [OECD press release, May 2024](https://www.oecd.org/en/about/news/press-releases/2024/05/oecd-updates-ai-principles-to-stay-abreast-of-rapid-technological-developments.html)
- 1.2: AI actors should respect "the rule of law, human rights, democratic and human-centred values" and implement safeguards including "capacity for human agency and oversight" — [OECD Recommendation text (May 2024, raw)](https://clairk.digitalpolicyalert.org/documents/oecd-ai-principles-3-may-2024-version/raw); official instrument: [OECD-LEGAL-0449](https://legalinstruments.oecd.org/en/instruments/OECD-LEGAL-0449)
- 1.3: provide "meaningful information, appropriate to the context" … "to enable those affected by an AI system to understand the output" — [OECD Recommendation text](https://clairk.digitalpolicyalert.org/documents/oecd-ai-principles-3-may-2024-version/raw)
- 1.4: "AI systems should be robust, secure and safe throughout their entire lifecycle"; 2024 addition: mechanisms so that if AI systems "risk causing undue harm or exhibit undesired behaviour, they can be overridden, repaired, and/or decommissioned safely by human interaction" — [OECD Recommendation text](https://clairk.digitalpolicyalert.org/documents/oecd-ai-principles-3-may-2024-version/raw); [Digital Policy Alert – Principle 1.4](https://digitalpolicyalert.org/ai-rules/oecd-principle-1-4); [Private AI summary of 2024 changes](https://www.private-ai.com/en/blog/oecd-ai-principles-2024)
- 2024 update also added information-integrity language (to 1.4) and moved some elements into 1.5 Accountability — [Digital Policy Alert – 2024 update](https://digitalpolicyalert.org/ai-rules/2024-update-OECD-principles); [Private AI](https://www.private-ai.com/en/blog/oecd-ai-principles-2024)
- 1.5: "AI actors should be accountable for the proper functioning of AI systems" and should "ensure traceability, including in relation to datasets, processes and decisions" — [OECD Recommendation text](https://clairk.digitalpolicyalert.org/documents/oecd-ai-principles-3-may-2024-version/raw)

**UNESCO**
- Recommendation on the Ethics of AI adopted Nov 2021 by 193 Member States; 10 core principles: Proportionality and do no harm; Safety and security; Right to privacy and data protection; Multi-stakeholder and adaptive governance and collaboration; Responsibility and accountability; Transparency and explainability; Human oversight and determination; Sustainability; Awareness and literacy; Fairness and non-discrimination — [UNESCO Recommendation page](https://www.unesco.org/en/artificial-intelligence/recommendation-ethics); [full text PDF (OHCHR mirror)](https://www.ohchr.org/sites/default/files/2022-03/UNESCO.pdf)
- UNESCO summary: AI systems should be "auditable and traceable" with oversight, impact assessment, audit and due diligence mechanisms; transparency/explainability level "appropriate to the context"; AI should not "displace ultimate human responsibility and accountability" — [UNESCO Recommendation page](https://www.unesco.org/en/artificial-intelligence/recommendation-ethics)

### Inferences
- Best one-line citations for the pitch: OECD 1.4 "overridden, repaired, and/or decommissioned safely by human interaction" → global pause + per-job undo; OECD 1.5 "traceability … processes and decisions" → append-only audit log; UNESCO "Human oversight and determination" → suggestion-only edits (student remains author); UNESCO "Awareness and literacy" → AI usage disclosure export as learning aid.
- These are high-level principles for governments/AI actors, not auditable requirements; phrase as "aligned with" (부합), never "compliant".

### Gaps
- Exact full paragraph text of OECD 1.2–1.5 was obtained via a third-party mirror of the May 2024 text (Digital Policy Alert/Clairk); official OECD instrument page did not render in fetch. Quotes are short fragments.

---

## Q4. Korea's national guidance: 인공지능 윤리기준 (2020), TTA 신뢰할 수 있는 인공지능 개발 안내서 (incl. 생성형 AI 편), and 인공지능기본법

### Takeaway
Korea provides a three-layer stack the team can cite: (1) **인공지능 윤리기준** (Dec 2020): 최고가치 '인간성', 3대 원칙, 10대 핵심요건; (2) **TTA 개발안내서** (2024 ed., last updated Aug 2025): 15 development requirements + 67 verification items, with a **생성 AI 기반 서비스** sector edition; (3) **인공지능기본법** in force since **2026-01-22**, with transparency (사전 고지·결과물 표시) duties for generative AI and extra duties for 고영향 AI, plus a ≥1-year 과태료 grace period.

### Cited Findings
**인공지능 윤리기준 (과기정통부·KISDI, 2020.12)**
- 최고가치: 인간성(Humanity). 3대 기본원칙: ① 인간의 존엄성 원칙 ② 사회의 공공선 원칙 ③ 기술의 합목적성 원칙 — [KISDI AI 윤리 포털](https://ai.kisdi.re.kr/aieth/main/contents.do?menuNo=400029); [ZDNet Korea 2020-12-23](https://zdnet.co.kr/view/?no=20201223105913)
- 10대 핵심요건: ① 인권 보장 ② 프라이버시 보호 ③ 다양성 존중 ④ 침해금지 ⑤ 공공성 ⑥ 연대성 ⑦ 데이터 관리 ⑧ 책임성 ⑨ 안전성 ⑩ 투명성; to be met across the whole AI lifecycle — [KISDI](https://ai.kisdi.re.kr/aieth/main/contents.do?menuNo=400029); [AI타임스](https://www.aitimes.com/news/articleView.html?idxno=135096); [국가전략포털](https://nsp.nanet.go.kr/plan/subject/detail.do?nationalPlanControlNo=PLAN0000037532)

**TTA 신뢰할 수 있는 인공지능 개발 안내서**
- Provides **15 development requirements and 67 verification items**; derives four attributes — 다양성 존중, 책임성, 안전성, 투명성 — from the 10 핵심요건 of the 윤리기준; recommends companies select requirements/items by their capability and product characteristics — [KISDI 신뢰성 개발 안내서](https://ai.kisdi.re.kr/aieth/main/contents.do?menuNo=400041); [TTA GitBook 일반 분야](https://tta-trustworthy-ai.gitbook.io/general)
- Editions: 자율주행·의료·공공사회 (2023); 채용·스마트치안·**생성 AI 기반 서비스** (2024); 2024 edition published Feb 2024, GitBook last updated 2025-08-14; 2025 updates added generative-AI XAI cases, GPAI risk-management frameworks and generative-content watermarking trends — [TTA GitBook](https://tta-trustworthy-ai.gitbook.io/general); [TTA 2024 안내서 4종 게시물](https://www.tta.or.kr/tta/selectBbsNttView.do?key=74&bbsNo=105&nttNo=13315)
- The 15 requirement titles (identical structure in the 생성 AI 기반 서비스 edition): 01 인공지능 시스템에 대한 위험관리 계획 및 수행 / 02 인공지능 거버넌스 체계 구성 / 03 인공지능 시스템의 신뢰성 테스트 계획 수립 / 04 인공지능 시스템의 추적가능성 및 변경이력 확보 / 05 데이터의 활용을 위한 상세 정보 제공 / 06 데이터 견고성 확보를 위한 이상 데이터 점검 / 07 수집 및 가공된 학습 데이터의 편향 제거 / 08 오픈소스 라이브러리의 보안성 및 호환성 점검 / 09 인공지능 모델의 편향 제거 / 10 인공지능 모델 공격에 대한 방어 대책 수립 / 11 인공지능 모델 명세 및 추론 결과에 대한 설명 제공 / 12 인공지능 시스템 구현 시 발생 가능한 편향 제거 / 13 인공지능 시스템의 안전 모드 구현 및 문제발생 알림 절차 수립 / 14 인공지능 시스템의 설명에 대한 사용자의 이해도 제고 / 15 서비스 제공 범위 및 상호작용 대상에 대한 설명 제공 — [TTA GitBook index (llms.txt)](https://tta-trustworthy-ai.gitbook.io/general/llms.txt); example page: [요구사항 06](https://tta-trustworthy-ai.gitbook.io/general/ai/part2/06)

**인공지능기본법 (인공지능 발전과 신뢰 기반 조성 등에 관한 기본법)**
- In force since **2026-01-22**; guidelines released alongside; 과태료 등 규제는 "최소 1년 이상" 유예(계도기간), 사실조사는 "극히 예외적인 경우에만" — [대한민국 정책브리핑 korea.kr](https://www.korea.kr/news/policyNewsView.do?newsId=148958380)
- Transparency (제31조): 고영향 AI 또는 생성형 AI 기반 제품·서비스 제공 시 해당 AI 기반 운용 사실을 이용자에게 **사전 고지**; 생성형 AI 결과물은 생성형 AI가 생성했다는 사실을 **표시**; 딥페이크는 명확히 인식 가능하게 표시 — [korea.kr](https://www.korea.kr/news/policyNewsView.do?newsId=148958380); [김·장 법률사무소 (제정안 해설)](https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=30837)
- Per the decree/guideline as summarized by secondary sources: marking may be done in a machine-readable way, with at least one notice/phrase to the user; exemption where AI use is evident from product name/UI — [국가법령정보센터 시행령](https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=198075&chrClsCd=010202) (search-result summary; not fetched verbatim)
- 고영향 AI: "사람의 생명, 신체의 안전 및 기본권에 중대한 영향을 미치거나 위험을 초래할 우려가 있는 인공지능시스템" in enumerated domains including 에너지, 보건의료, 의료기기, 채용, 대출심사, 교통, 공공서비스, **교육에서의 학생 평가** — [김·장](https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=30837); [한국경제 2026-04-16](https://www.hankyung.com/article/202604164209i)
- 고영향 AI 사업자 책무 (제34조): 위험관리 방안, 설명 방안, 이용자 보호, **사람의 관리·감독**, 문서 작성·보관 등 — [김·장](https://www.kimchang.com/ko/insights/detail.kc?sch_section=4&idx=30837)
- Determination of 고영향 status considers domain relevance + provision to third parties, whether there's a risk of "중대한 영향", and "의도된 목적, 기능, 활용, 맥락이 종합적으로 고려"; the article notes human-in-the-loop involvement may bear on (weigh against) 고영향 classification — [한국경제](https://www.hankyung.com/article/202604164209i)
- Law text portal — [국가법령정보센터 인공지능기본법](https://www.law.go.kr/lsInfoP.do?lsiSeq=268543)

**Other Korean education signals**
- 교육부 has issued a press release on managing AI use in 수행평가 (performance assessment) — [교육부 보도자료](https://www.moe.go.kr/boardCnts/viewRenew.do?boardID=294&boardSeq=104984&lev=0&m=020402) (not read in detail)

### Inferences
- Feature ↔ TTA requirement mapping (strong, checklist-able): 위험 레지스터 → 01; 신뢰성 테스트/벤치마크 하네스 → 03; provenance marks + append-only audit log + per-job undo history → **04 추적가능성 및 변경이력 확보**; prompt-injection defenses + red-team set → **10 모델 공격에 대한 방어 대책**; explanation cards → **11 추론 결과에 대한 설명 제공** and **14 사용자 이해도 제고**; global pause + no-touch zones + "verification needed" alerts → **13 안전 모드 구현 및 문제발생 알림 절차**; AI usage disclosure export + onboarding notice → **15 서비스 제공 범위 및 상호작용 대상 설명**; third-party LLM API/libraries → 08.
- Feature ↔ 윤리기준: suggestion-only / human authorship → 인간의 존엄성·인권 보장; audit log → 책임성; disclosure/explanations → 투명성; injection defenses/pause → 안전성; data minimization of documents → 프라이버시 보호·데이터 관리.
- 인공지능기본법: Co-Pen as a generative-AI service likely triggers the **generative-AI transparency duties** (사전 고지 + 결과물 표시) regardless of 고영향 status → provenance marks + disclosure export are a direct, credible "legal readiness" story. Say "대비/부합하도록 설계", not "준수 인증".
- 고영향 (Korea): Co-Pen does not perform 학생 평가 (grading), so it is most defensibly positioned as **not 고영향**, while noting that if a future feature scored/graded students, that would change.

### Gaps
- Could not fetch verbatim Article 2(4) text; the exact education-level scope of "학생 평가" (e.g., whether it references 유아·초·중등교육 only, which would exclude universities) is **unverified** — the report-writer must check law.go.kr before asserting universities are out of scope.
- Could not confirm whether a dedicated TTA "생성형 AI 기반 서비스" checklist differs item-by-item from the general 67 items (index says identical 15 requirements with sector adaptations).
- Did not locate the official MSIT 고영향 AI 판단 가이드라인 or 투명성 가이드라인 documents themselves.

---

## Q5. Would Co-Pen be "high-risk" under the EU AI Act (Annex III, education)?

### Takeaway
Probably **not**, as currently designed: Annex III point 3 targets AI that decides admission/access, **evaluates learning outcomes**, assesses the appropriate level of education, or **monitors/detects prohibited behaviour during tests**. A co-writing assistant that only suggests text and does not grade, assess, or proctor is not in those use-cases — but the answer depends on intended purpose, and features such as auto-grading, contribution scoring used by instructors, or AI-detection/cheating flags would move it toward Annex III. Also: Co-Pen targets Korean universities; the EU Act only applies if placed on the EU market or outputs used in the EU. Annex III obligations were deferred to **2 Dec 2027** by the 2026 Digital Omnibus.

### Cited Findings
- Annex III point 3 "Education and vocational training": (a) AI systems intended to determine "access or admission or to assign natural persons to educational and vocational training institutions at all levels"; (b) to "evaluate learning outcomes, including when those outcomes are used to steer the learning process"; (c) assessing "the appropriate level of education that an individual will receive or will be able to access"; (d) "monitoring and detecting prohibited behaviour of students during tests" — [AI Act Annex III (artificialintelligenceact.eu)](https://artificialintelligenceact.eu/annex/3/); official text: [EUR-Lex Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- The 7 high-risk requirements map to Articles 9 (risk management), 10 (data and data governance), 11 (technical documentation), 12 (record-keeping), 13 (transparency and provision of information to deployers), 14 (human oversight), 15 (accuracy, robustness and cybersecurity) — [EUR-Lex 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- Digital Omnibus: Council final approval on 2026-06-29; stand-alone Annex III high-risk obligations deferred from 2 Aug 2026 to **2 Dec 2027**; Annex I product-embedded AI to 2 Aug 2028; substance of obligations (risk management, documentation, human oversight, post-market monitoring) unchanged — [CSA research note](https://labs.cloudsecurityalliance.org/research/csa-research-note-eu-ai-act-omnibus-vii-deadline-delay-20260/); [Gibson Dunn](https://www.gibsondunn.com/eu-ai-act-omnibus-agreement-postponed-high-risk-deadlines-and-other-key-changes/); [Pinsent Masons](https://www.pinsentmasons.com/out-law/news/rules-high-risk-ai-delayed-under-eu-omnibus-deal)
- Commentary notes that 2 Aug 2026 "still matters" because most transparency-related obligations were not deferred in the same way — [Jones Walker](https://www.joneswalker.com/en/insights/blogs/ai-law-blog/yes-august-2-still-matters-the-eu-approved-a-high-risk-ai-delay-but-most-trans.html?id=102nbon) (title/snippet only; not read in full)

### Inferences
- Careful pitch wording: "Co-Pen은 학생을 평가·선발·감독하지 않는 공동 작성 보조 도구로 설계되어, EU AI Act 부속서 III의 교육 분야 고위험 용도(입학·학습성과 평가·교육수준 판정·시험 부정행위 감시)에 해당하지 않도록 의도된 목적을 한정한다. 다만 고위험 시스템의 7대 요구사항을 **설계 참조 기준(voluntary benchmark)**으로 삼았다."
- Design guardrails that keep it out of scope: no grading/scoring of students; contribution statistics (if any) presented as student-facing self-reflection, not instructor-facing evaluation; no "AI-written detection" / cheating monitoring.
- Irrespective of high-risk status, generative-AI transparency duties (EU Art. 50: disclosure/marking of AI-generated content) and Korea's 제31조 are the more relevant obligations for Co-Pen → provenance marks and disclosure export.
- The 7 requirements still make a good internal checklist: Art. 9 → risk register; Art. 10 → data handling of shared documents/prompts; Art. 11 → model/system card; Art. 12 → append-only audit log; Art. 13 → explanation cards + disclosure; Art. 14 → suggestion-only, undo, pause, no-touch zones; Art. 15 → verification flags, benchmark, injection defenses.

### Gaps
- Did not verify Article 6(3) derogation text (systems performing narrow procedural tasks / improving a previously completed human activity may not be high-risk if they don't pose significant risk) — known from the Act's structure but not fetched this session; should be checked on EUR-Lex before citing.
- Did not confirm the exact post-Omnibus application date of Art. 50(2) machine-readable marking for generative AI (some reports suggest a grace period for systems already on the market); verify before citing a date.
- No Commission guidelines on Annex III education use-cases were checked.

---

## Q6. How do the frameworks recommend measuring trustworthiness (metrics, TEVV), and how can Co-Pen present metrics credibly?

### Takeaway
NIST's MEASURE function asks for metrics that are (a) chosen for the most significant mapped risks, (b) demonstrated in conditions similar to deployment, (c) empirically validated rather than anecdotal, (d) checked for construct validity, and (e) complemented by red-teaming, user testing and structured feedback. TTA requirement 03 asks for a documented reliability test plan. So Co-Pen should present a small number of pre-registered, risk-linked metrics with test-set descriptions and limitations — not a single "trust score".

### Cited Findings
- MEASURE 1.1: "Approaches and metrics for measurement of AI risks enumerated during the MAP function are selected for implementation starting with the most significant AI risks. The risks or trustworthiness characteristics that will not – or cannot – be measured are properly documented." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MEASURE 2.3: measure performance "for conditions similar to deployment setting(s)"; MS-2.3-002 "empirically validated methods" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MS-2.5-001: avoid extrapolating from "narrow, non-systematic, and anecdotal assessments" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MS-2.13-001: document "construct validity for each metric" and "biases or statistical variance in applied metrics or structured human feedback processes" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MS-1.1-004: "Develop a suite of metrics to evaluate structured public feedback exercises informed by representative AI Actors." MS-2.7-003: "Conduct user surveys to gather user satisfaction with the AI-generated content and user perceptions of content authenticity." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MS-2.7-002: "Benchmark GAI system security and resilience related to content provenance against industry standards and best practices." — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- MS-4.2-005: "Verify and document the incorporation of results of structured public feedback exercises into design, implementation, deployment approval ('go'/'no-go')…" — [NIST AI 600-1](https://nvlpubs.nist.gov/nistpubs/ai/NIST.AI.600-1.pdf)
- TTA 요구사항 03 "인공지능 시스템의 신뢰성 테스트 계획 수립" (reliability test planning) and 13 "안전 모드 구현 및 문제발생 알림 절차 수립" — [TTA GitBook index](https://tta-trustworthy-ai.gitbook.io/general/llms.txt)

### Inferences
Draft "Framework → Feature → Evidence/Metric" table for the pitch (metrics are proposals, not measured results):

| Co-Pen feature | NIST AI RMF / AI 600-1 | EU AI Act (7 req., reference only) | OECD / UNESCO | Korea (윤리기준 / TTA / 기본법) | Evidence / metric (proposed) |
|---|---|---|---|---|---|
| Suggestion-only AI edits | GOVERN 3.2, GV-3.2-003; MANAGE 4.1 (appeal & override) | Art. 14 human oversight | OECD 1.2 human agency & oversight; UNESCO human oversight & determination | 윤리기준 인간의 존엄성·인권 보장; 기본법 제34조 사람의 관리·감독(고영향 대상, 참고) | % of AI changes entering doc without human accept = 0 (automated test); suggestion accept/reject/modify rates |
| AI-only & per-job selective undo | MANAGE 4.1; MS-4.2-004 (document overrides) | Art. 14 (ability to disregard/override/reverse output) | OECD 1.4 "overridden, repaired…" | TTA 04 변경이력, 13 안전 모드 | Undo correctness on test suite (AI spans removed, human spans byte-identical); undo latency |
| Preserve human edits during concurrent AI rewrite | MP-3.4-005 (track human-GAI configuration outcomes) | Art. 15 robustness | OECD 1.4 robustness | 윤리기준 침해금지; TTA 13 | Human-edit preservation rate under concurrency benchmark (target 100%), conflict count per 1k ops |
| AI no-touch zones & global pause | GOVERN 1.7 (GV-1.7-001); MANAGE 2.4 (MG-2.4-001/002) | Art. 14 ("stop" button-type intervention) | OECD 1.4 decommission/override | TTA 13 안전 모드 | Zone violation count = 0 on fuzzed edits; time-to-halt after pause (ms) |
| Provenance marks & append-only audit log | MP-3.4-001; MG-2.2-007; GV-1.6-003 | Art. 12 record-keeping | OECD 1.5 traceability; UNESCO auditable & traceable | TTA 04 추적가능성; 윤리기준 책임성; 기본법 제31조 결과물 표시 | Provenance coverage (% AI-origin characters marked); log completeness (events logged/events emitted); tamper-evidence check (hash chain verify) |
| AI usage disclosure export | GV-5.1-002; MEASURE 2.8 | Art. 13 transparency (+ Art. 50 generative-AI transparency) | OECD 1.3; UNESCO transparency, awareness & literacy | 윤리기준 투명성; TTA 15; 기본법 제31조 사전 고지·표시 | Export matches audit log (reconciliation 100%); user comprehension check |
| "Verification needed" flags on AI-introduced facts | Confabulation / Information Integrity risks; MS-2.5-003; MG-4.1-002/004 | Art. 15 accuracy | OECD 1.4 information integrity | 윤리기준 안전성; TTA 11 | Flag recall & precision on labeled set of AI claims; unsupported-claim rate before/after flags |
| Explanation cards | MEASURE 2.9; MS-2.8-004 (user testing) | Art. 13 | OECD 1.3 "understand the output"; UNESCO transparency & explainability | TTA 11, 14 이해도 제고 | User-test comprehension score; task-level trust calibration (over-/under-reliance) |
| Prompt-injection defenses + red-team set | MEASURE 2.7; MS-2.7-007 (names prompt injection); MP-5.1-005; GV-3.2-005 | Art. 15 cybersecurity | OECD 1.4 security | TTA 10 모델 공격 방어; 윤리기준 안전성 | Attack success rate (ASR) on red-team set (by category), false-block rate on benign docs; set size & version |
| Benchmark harness & metrics | MEASURE 1.1, 2.3 (MS-2.3-002), 2.5 (MS-2.5-001), 2.13 (MS-2.13-001) | Art. 9 & 15 (testing) | OECD 1.5 accountability | TTA 03 신뢰성 테스트 계획 | Published test plan; metric definitions with construct-validity note; limitations section |

- Credibility rules derived from NIST: report n (sample sizes), test conditions resembling real team-assignment editing, variance/CI where possible, what is *not* measured (MEASURE 1.1), and avoid generalizing from demos (MS-2.5-001).
- Lifecycle framing (lecture): 계획(risk register, TTA 01/02, MAP) → 데이터(document/prompt handling, TTA 05–07) → 모델링(model choice, injection defenses, TTA 08–10) → 평가(benchmark harness, red-team, TTA 03, MEASURE) → 배포/모니터링(audit log, override tracking, MANAGE 4.1, TTA 13) → 폐기(GOVERN 1.7 decommissioning; data retention/deletion of logs).
- Impact assessment framing: errors in Co-Pen are largely **reversible** (suggestion-only + undo + audit log) which lowers severity; the less reversible harm is academic-integrity/authorship misattribution in graded work → disclosure export and provenance are the key mitigations.
- Anti-over-claiming vocabulary: use "참고·정렬(aligned with / informed by)", "대비 설계(designed for readiness)", "자체 평가(self-assessment)"; avoid "준수(compliant)", "인증(certified)", "고위험 요건 충족".

### Gaps
- No framework prescribes numeric thresholds for these metrics; any targets (e.g., 100% preservation, ASR < x%) are team choices and should be labeled as such.
- Did not find a published standard metric for "verification flag" quality specific to co-writing tools; precision/recall on a labeled set is a reasonable but self-defined approach.
