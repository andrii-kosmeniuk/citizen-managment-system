# AI Usage Documentation

## 1) How have you used AI?

AI was mainly used for explanations and as an implementation assistant throughout the project.

To work efficiently, AI was guided with clear and detailed instructions documented in `RULES.md`. Each step was implemented one at a time and rigorously tested before approval and commit. This approach improved efficiency, reduced bugs and ambiguities, and provided a deeper understanding of each project process.


## 2) For what was it helpful?

AI was most helpful for:
- debugging and identifying probable causes of errors,
- explaining new features and implementation options,
- speeding up repetitive work (boilerplate, docs structure, route/schema scaffolding),
- drafting clear step-by-step instructions for setup and testing.

## 3) Where was it not really helpful?

AI was less reliable for:
- fixing issues without specific and detailed instructions (it sometimes entered loops),
- project-specific runtime issues that depended on local environment state,
- assumptions about current branch/commit state without checking actual files,
- edge-case business rules unless explicitly provided,
- final validation of behavior without running real tests.

Because of that, all critical outputs were manually verified by reading code, executing scripts, and running tests.

## 4) Which prompts or workflows have you used?

### Prompt patterns used
- "Implement phase X, run tests, and mark completion only if tests pass."
- "Suggest how the current database can be changed into a more scalable, production-ready schema."
- "Fix this API/CI error, without violating previous code progress and explain what changed."
- "Translate this documentation section and keep command examples unchanged."

### Workflow used with AI
1. Define requirement in small, concrete tasks.
2. Ask AI for implementation draft.
3. Apply changes in codebase.
4. Run local checks/tests (`check_backend.sh`, `check_frontend.sh`, `check_all.sh`).
5. Review diffs manually and adjust naming/consistency.
6. Update documentation (README, architecture/specification, AI usage notes).
7. Push and validate CI results.
8. Repeat in small steps until the whole plan is completed.
