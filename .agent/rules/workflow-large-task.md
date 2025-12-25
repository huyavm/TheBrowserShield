---
trigger: always_on
---

# Large Task Workflow Rules for Antigravity Coding Agent

> Scope: **Workflow orchestration**
> Applies to: **Coding Agent**
> Purpose: Standardize handling of **large tasks vs small tasks** and control execution via strict command syntax

---

## 1. Task Definitions

### 1.1 Large Task

A task is considered a **Large Task** if it meets **at least one** of the following conditions:

* Modifies **two or more files**
* Introduces architectural changes, processing flows, or directory structure changes
* Consists of multiple dependent steps
* Has potential risk to existing logic or stability
* The user request contains keywords such as:

  * "build", "design", "refactor", "implement", "restructure", "system"

👉 Large Tasks **MUST** follow the mandatory 3-step workflow.

---

### 1.2 Small Task

A task is considered a **Small Task** when:

* Only **one file** is modified
* The change is localized and straightforward
* No architectural or cross-module impact

Examples:

* Fixing a minor bug
* Adding validation logic
* Updating a single function

👉 Small Tasks are **ALLOWED to be auto-executed immediately** following Coding Agent rules.

---

## 2. Mandatory Workflow for Large Tasks

Before making **any code changes**, the agent **MUST** complete the following steps **in strict order**:

### Step 1 – Planning

Required output:

* Objective
* Scope of work
* Explicit exclusions (what will NOT be done)
* Assumptions and risks

⛔ File writing is **NOT allowed** at this stage

---

### Step 2 – Design

Required output:

* High-level design
* Main components
* Processing / data flow (text-based description)
* Key technical decisions

⛔ File writing is **NOT allowed** at this stage

---

### Step 3 – Task Breakdown

* Decompose work into **independent, executable tasks**
* Each task MUST include:

  * Task ID (numeric)
  * Task name
  * Description
  * Related files
  * Status

Initial status for all tasks:

```
⏸ Not Started
```

---

## 3. Standardized START TASK Command

### 3.1 Valid Syntax (CASE-SENSITIVE)

The agent **ONLY accepts** the following exact command to begin a task:

```
START TASK <n>
```

Where:

* `<n>` is the numeric Task ID defined in Step 3

Valid examples:

* `START TASK 1`
* `START TASK 3`

Invalid examples:

* `start task 1`
* `Start Task 1`
* `Begin task 1`

👉 Any invalid syntax **MUST be rejected**.

---

## 4. Task Execution Rules

Upon receiving a valid `START TASK <n>` command:

* Execute **only** the task with Task ID = `<n>`
* Modify **only** the files declared for that task
* Fully comply with all **Coding Agent Rules**

---

## 5. Task Completion Rules

After completing a task, the agent MUST:

* Update task status to:

```
✅ Completed
```

* Provide a brief report including:

  * Task ID
  * Summary of work performed
  * List of files written (no diffs)

* Then **STOP and wait** for the next command

---

## 6. Behavior Without START Command

* The agent **MUST NOT** automatically execute any task
* The agent **MUST NOT** infer or assume the next task
* The agent may only:

  * Present planning, design, or task lists
  * Provide explanations when asked

---

## 7. Rule Priority Order

Priority hierarchy:

1. Large Task Workflow Rules (this file)
2. Coding Agent Rules
3. Language Rule (Vietnamese required unless explicitly overridden)

---

**End of Large Task Workflow Rules**
