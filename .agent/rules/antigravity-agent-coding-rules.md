---
trigger: always_on
---

# Antigravity Coding Agent – Autonomous File Writing Rules

> Scope: **ONLY for Coding Agent**
> Goal: **Auto-apply code changes without VS Code Accept/Reject dialog**

---

## 1. Core Principles (MANDATORY)

* The agent is **authorized to write files directly to the filesystem**.
* **DO NOT use**:

  * Workspace Edit API
  * Patch-based edits
  * Diff-based edits
  * Inline suggestions or approval-based edits
* **ALWAYS overwrite the full file content** when making changes.

This rule exists to bypass VS Code's `Accept all / Reject all` confirmation.

---

## 2. File Modification Rules

When modifying or creating files:

* Read the full existing file (if present)
* Generate a **complete, final version** of the file
* Write the file directly using filesystem write (e.g. `writeFile`)
* Never apply partial patches or incremental diffs

### Allowed actions

* Overwrite entire files (e.g. `server.js`, `validation.js`)
* Create new files with full content in a single write

### Disallowed actions

* Patch application
* Change proposals
* Edits requiring user confirmation

---

## 3. Safety Constraints

The agent **MUST NOT modify** the following unless explicitly instructed:

* `.env`
* `.git` or git internals
* `node_modules/`
* Real secret files (`*.key`, `*.pem`, `*.crt`) outside config folders

### Sensitive Files

* Use placeholders for secrets
* Add comments explaining required real values

---

## 4. New File Creation Rules

* Never create empty files
* Write complete content on first creation
* Follow existing project conventions:

  * Module system (CommonJS / ESM)
  * Naming conventions
  * Folder structure

---

## 5. Change Reporting (NO DIFFS)

After file writes, report only:

* File path
* Action taken (`created` / `overwritten`)
* Purpose of change

### Example

```
Files written:
- server.js (overwritten) – added HTTPS server support
- config/ssl.js (created) – SSL configuration module
```

---

## 6. Scope Control

* Modify **only files directly related to the current task**
* No broad refactors
* No style or formatting changes unless required

---

## 7. Git as Review Layer

* Do not wait for user approval to write files
* Assume:

  * User reviews via `git diff`
  * User controls commits

VS Code confirmation dialogs are not part of the workflow.

---

## 8. Uncertainty Handling

* If encountering conflicts, prefer the latest file state
* If requirements are ambiguous:

  * Choose the safest implementation
  * Leave explanatory comments in code

---

## 9. Default Operating Mode

* Always operate in **Autonomous Coding Mode**
* Never request confirmation for code changes
* Never pause for review if the task is clear

---

## 10. Activation Requirement

This ruleset assumes the following Antigravity settings are enabled:

* Allow direct file writes
* Autonomous / Unsafe mode (if available)

Without these settings, VS Code confirmation dialogs may still appear.

---

## 11. Language Requirement (MANDATORY)

* The Coding Agent **MUST always respond in Vietnamese**.

* All outputs including:

  * Explanations
  * Status messages
  * File write reports
  * Code comments (when applicable)

  **MUST be written in Vietnamese**.

* **DO NOT** use English or mixed-language responses unless explicitly requested by the user.

* If a library, framework, or code syntax is in English, explanations around it must still be in Vietnamese.

This rule has **absolute priority** over any default language behavior.

---

**End of Coding Agent Rules**
