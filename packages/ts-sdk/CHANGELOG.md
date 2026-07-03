# @yarlisai/studio-sdk

## 0.5.0

### Minor Changes

- [#1115](https://github.com/YarlisAISolutions/mybotbox-platform/pull/1115) [`eccced5`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/eccced58348cafc65fdc3e624b4db0d6db3ed088) Thanks [@siri1410](https://github.com/siri1410)! - Add browser device-login so the SDK can authenticate itself (gh-style), no
  hand-pasted key required:
  - `MyBotBoxClient.login({ host?, scope? })` — runs the OAuth device flow (prints a
    one-time code, opens the browser, polls for the token) and returns a ready
    client. Credentials are stored in `~/.mybotbox/hosts.json`, shared with the
    `mybotbox` CLI.
  - `deviceLogin()` / `loadStoredToken()` exported for lower-level use;
    `MyBotBoxClient.fromStoredCredentials()` builds a client from a saved token.
  - `apiKey` is now optional — the client auto-loads `MYBOTBOX_TOKEN` (any env) or a
    stored device token.
  - New `AuthExpiredError` + `isAuthExpired()` — a 401 now signals re-authentication
    (device tokens expire after 90 days).

## 0.4.0

### Minor Changes

- [#1081](https://github.com/YarlisAISolutions/mybotbox-platform/pull/1081) [`01ef812`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/01ef812f18f7384f821966e17d7a3bf0f9caed52) Thanks [@siri1410](https://github.com/siri1410)! - Expose the Copilot model lineup (`COPILOT_MODELS`, `ACTIVE_COPILOT_MODELS`, `DEFAULT_COPILOT_MODEL`, provider order/labels) as generated data synced from `@yarlisai/ai/copilot` — external agents no longer hardcode model ids. Regenerate with `bun scripts/sync-sdk-copilot-models.mjs`; drift is CI-gated by `copilot-models.sync.test.ts`.

## 0.3.2

### Patch Changes

- [#929](https://github.com/YarlisAISolutions/mybotbox-platform/pull/929) [`2de9e8a`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/2de9e8ae8414dcd0708087986da6ba345b8a4238) Thanks [@siri1410](https://github.com/siri1410)! - Fix `getJobStatus` to call the live `/api/workflows/{id}/status` endpoint instead of the non-existent `/api/jobs/{taskId}` route (TypeScript + Python SDKs).

## 0.3.1

### Patch Changes

- [#850](https://github.com/YarlisAISolutions/mybotbox-platform/pull/850) [`0603d4f`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/0603d4fadc4d449e81a73d8f8da241cdac39a569) Thanks [@siri1410](https://github.com/siri1410)! - Correct package metadata for clean `publint` and a resolvable repository link. The `repository.url` now uses the full `git+https://…` form and points at the package's real public source home (`github.com/YarlisAISolutions/studio-sdk`), the matching `bugs.url` is updated, and `"sideEffects": false` is declared so bundlers can tree-shake the SDK. No runtime or API changes.

## 0.3.0

### Minor Changes

- [#639](https://github.com/YarlisAISolutions/mybotbox-platform/pull/639) [`e07524a`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/e07524a20f0e8a077f796cdfc7c41fa04f3d0130) Thanks [@siri1410](https://github.com/siri1410)! - Add workspace management methods to `MyBotBoxClient`: `listWorkspaces`, `getWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`. These call the now hybrid-authed workspace routes (session OR X-API-Key) — completing the SDK's management surface alongside workflows and projects/folders.

## 0.2.0

### Minor Changes

- [#635](https://github.com/YarlisAISolutions/mybotbox-platform/pull/635) [`57f1f8e`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/57f1f8e2272442819604960f76ab4365395489ba) Thanks [@siri1410](https://github.com/siri1410)! - Add management (CRUD) methods to `MyBotBoxClient`: workflows (list/get/create/update/delete/duplicate/deploy/restore + moveWorkflow) and projects/folders (listProjects/listFolders/createFolder/updateFolder/deleteFolder). These call the now hybrid-authed management routes using the existing `X-API-Key` auth, bringing the SDK toward HTTP-API parity beyond execution-only.
