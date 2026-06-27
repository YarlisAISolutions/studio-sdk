# @yarlisai/studio-sdk

## 0.3.0

### Minor Changes

- [#639](https://github.com/YarlisAISolutions/mybotbox-platform/pull/639) [`e07524a`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/e07524a20f0e8a077f796cdfc7c41fa04f3d0130) Thanks [@siri1410](https://github.com/siri1410)! - Add workspace management methods to `MyBotBoxClient`: `listWorkspaces`, `getWorkspace`, `createWorkspace`, `updateWorkspace`, `deleteWorkspace`. These call the now hybrid-authed workspace routes (session OR X-API-Key) — completing the SDK's management surface alongside workflows and projects/folders.

## 0.2.0

### Minor Changes

- [#635](https://github.com/YarlisAISolutions/mybotbox-platform/pull/635) [`57f1f8e`](https://github.com/YarlisAISolutions/mybotbox-platform/commit/57f1f8e2272442819604960f76ab4365395489ba) Thanks [@siri1410](https://github.com/siri1410)! - Add management (CRUD) methods to `MyBotBoxClient`: workflows (list/get/create/update/delete/duplicate/deploy/restore + moveWorkflow) and projects/folders (listProjects/listFolders/createFolder/updateFolder/deleteFolder). These call the now hybrid-authed management routes using the existing `X-API-Key` auth, bringing the SDK toward HTTP-API parity beyond execution-only.
