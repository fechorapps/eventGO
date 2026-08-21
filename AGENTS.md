<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Model and skill routing for EventGO

Before executing a non-trivial task, read `docs/model-routing-eventgo.md` and classify the task by risk and type.

### Model policy

- Default to GPT-5.6 Terra with Medium reasoning for production implementation.
- Recommend GPT-5.6 Sol with High reasoning for architecture, migrations, security, permissions, financial logic, destructive operations, and release reviews.
- Recommend GPT-5.6 Luna with Low or Medium reasoning for clear, repetitive work such as fixtures, formatting, translations, CSV transformations, and mechanical edits.
- Do not use Max or Ultra unless the task genuinely needs the additional depth or can be split into independent parallel work.
- If the active model does not match the task, warn before acting. The user can deliberately override the warning with `[modelo-confirmado]`.

### Skill policy

Load the smallest skill set that covers the task. Use one primary skill and at most one supporting skill unless the user explicitly requests a broader review. Announce the selected skills before taking actions.

- Product research, wedding workflows, feature discovery: `design-consultation`; add `product-designer` for user journeys and product behavior.
- Backlog-ready specification or execution plan: `spec`; add `plan-eng-review` only for architecture-heavy plans or `plan-design-review` only for interaction-heavy plans.
- ADR or architectural decision: `architecture`.
- Domain entities, aggregates, and business invariants: `domain-driven-design`.
- Dependency boundaries: `clean-architecture`.
- Feature/API slicing and implementation boundaries: `vertical-slice-architecture`.
- New UI or material visual redesign: `frontend-design`; use `impeccable` or `design-review` for critique and polish.
- React/Next.js implementation or performance: `vercel-react-best-practices`, in addition to reading the required local Next.js documentation above.
- Bug or root-cause investigation: `investigate`.
- Functional browser QA with fixes: `qa`; report-only testing: `qa-only`; direct browser automation: `playwright-cli`.
- Security, authorization, privacy, uploads, or payment-risk review: `security-review`; use `cso` only for a broad infrastructure and secrets audit.
- Performance regression measurement: `benchmark`.
- Documentation generation: `document-generate`; Markdown-to-PDF output: `make-pdf`.
- Pre-landing change review: `review`.
- Shipping or deployment: `ship` or `land-and-deploy` only when the user explicitly authorizes that operation.
- Codex models, pricing, configuration, hooks, or OpenAI product behavior: `openai-docs`.

The repository hook in `.codex/hooks.json` reinforces this routing on every submitted prompt. Treat the hook as a reminder, not as an authorization to expand scope or perform destructive actions.
