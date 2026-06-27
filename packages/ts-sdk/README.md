# MyBotBox TypeScript SDK

The official TypeScript/JavaScript SDK for [MyBotBox](https://mybotbox.com), allowing you to execute workflows programmatically from your applications.

## Installation

```bash
npm install @yarlisai/studio-sdk
# or
yarn add @yarlisai/studio-sdk
# or
bun add @yarlisai/studio-sdk
```

## Quick Start

```typescript
import { MyBotBoxClient } from '@yarlisai/studio-sdk';

// Initialize the client
const client = new MyBotBoxClient({
  apiKey: 'your-api-key-here',
  baseUrl: 'https://api.mybotbox.com' // optional, defaults to https://api.mybotbox.com
});

// Execute a workflow
try {
  const result = await client.executeWorkflow('workflow-id');
  console.log('Workflow executed successfully:', result);
} catch (error) {
  console.error('Workflow execution failed:', error);
}
```

## API Reference

### MyBotBoxClient

#### Constructor

```typescript
new MyBotBoxClient(config: MyBotBoxConfig)
```

- `config.apiKey` (string): Your MyBotBox API key
- `config.baseUrl` (string, optional): Base URL for the MyBotBox API (defaults to `https://api.mybotbox.com`)

#### Methods

##### executeWorkflow(workflowId, options?)

Execute a workflow with optional input data.

```typescript
const result = await client.executeWorkflow('workflow-id', {
  input: { message: 'Hello, world!' },
  timeout: 30000 // 30 seconds
});
```

**Parameters:**

- `workflowId` (string): The ID of the workflow to execute
- `options` (ExecutionOptions, optional):
  - `input` (any): Input data to pass to the workflow. File objects are automatically converted to base64.
  - `timeout` (number): Timeout in milliseconds (default: 30000)

**Returns:** `Promise<WorkflowExecutionResult>`

##### getWorkflowStatus(workflowId)

Get the status of a workflow (deployment status, etc.).

```typescript
const status = await client.getWorkflowStatus('workflow-id');
console.log('Is deployed:', status.isDeployed);
```

**Parameters:**

- `workflowId` (string): The ID of the workflow

**Returns:** `Promise<WorkflowStatus>`

##### validateWorkflow(workflowId)

Validate that a workflow is ready for execution.

```typescript
const isReady = await client.validateWorkflow('workflow-id');
if (isReady) {
  // Workflow is deployed and ready
}
```

**Parameters:**

- `workflowId` (string): The ID of the workflow

**Returns:** `Promise<boolean>`

##### executeWorkflowSync(workflowId, options?)

Execute a workflow and poll for completion (useful for long-running workflows).

```typescript
const result = await client.executeWorkflowSync('workflow-id', {
  input: { data: 'some input' },
  timeout: 60000
});
```

**Parameters:**

- `workflowId` (string): The ID of the workflow to execute
- `options` (ExecutionOptions, optional):
  - `input` (any): Input data to pass to the workflow
  - `timeout` (number): Timeout for the initial request in milliseconds

**Returns:** `Promise<WorkflowExecutionResult>`

##### setApiKey(apiKey)

Update the API key.

```typescript
client.setApiKey('new-api-key');
```

##### setBaseUrl(baseUrl)

Update the base URL.

```typescript
client.setBaseUrl('https://my-custom-domain.com');
```

## Types

### WorkflowExecutionResult

```typescript
interface WorkflowExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  logs?: any[];
  metadata?: {
    duration?: number;
    executionId?: string;
    [key: string]: any;
  };
  traceSpans?: any[];
  totalDuration?: number;
}
```

### WorkflowStatus

```typescript
interface WorkflowStatus {
  isDeployed: boolean;
  deployedAt?: string;
  isPublished: boolean;
  needsRedeployment: boolean;
}
```

### MyBotBoxError

```typescript
class MyBotBoxError extends Error {
  code?: string;
  status?: number;
}
```

## Examples

### Basic Workflow Execution

```typescript
import { MyBotBoxClient } from '@yarlisai/studio-sdk';

const client = new MyBotBoxClient({
  apiKey: process.env.MBB_API_KEY!
});

async function runWorkflow() {
  try {
    // Check if workflow is ready
    const isReady = await client.validateWorkflow('my-workflow-id');
    if (!isReady) {
      throw new Error('Workflow is not deployed or ready');
    }

    // Execute the workflow
    const result = await client.executeWorkflow('my-workflow-id', {
      input: {
        message: 'Process this data',
        userId: '12345'
      }
    });

    if (result.success) {
      console.log('Output:', result.output);
      console.log('Duration:', result.metadata?.duration);
    } else {
      console.error('Workflow failed:', result.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

runWorkflow();
```

### Error Handling

```typescript
import { MyBotBoxClient, MyBotBoxError } from '@yarlisai/studio-sdk';

const client = new MyBotBoxClient({
  apiKey: process.env.MBB_API_KEY!
});

async function executeWithErrorHandling() {
  try {
    const result = await client.executeWorkflow('workflow-id');
    return result;
  } catch (error) {
    if (error instanceof MyBotBoxError) {
      switch (error.code) {
        case 'UNAUTHORIZED':
          console.error('Invalid API key');
          break;
        case 'TIMEOUT':
          console.error('Workflow execution timed out');
          break;
        case 'USAGE_LIMIT_EXCEEDED':
          console.error('Usage limit exceeded');
          break;
        case 'INVALID_JSON':
          console.error('Invalid JSON in request body');
          break;
        default:
          console.error('Workflow error:', error.message);
      }
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}
```

### Environment Configuration

```typescript
// Using environment variables
const client = new MyBotBoxClient({
  apiKey: process.env.MBB_API_KEY!,
  baseUrl: process.env.YSTUDIO_BASE_URL // optional
});
```

### File Upload

File objects are automatically detected and converted to base64 format. Include them in your input under the field name matching your workflow's API trigger input format:

The SDK converts File objects to this format:

```typescript
{
  type: 'file',
  data: 'data:mime/type;base64,base64data',
  name: 'filename',
  mime: 'mime/type'
}
```

Alternatively, you can manually provide files using the URL format:

```typescript
{
  type: 'url',
  data: 'https://example.com/file.pdf',
  name: 'file.pdf',
  mime: 'application/pdf'
}
```

```typescript
import { MyBotBoxClient } from '@yarlisai/studio-sdk';
import fs from 'fs';

const client = new MyBotBoxClient({
  apiKey: process.env.MBB_API_KEY!
});

// Node.js: Read file and create File object
const fileBuffer = fs.readFileSync('./document.pdf');
const file = new File([fileBuffer], 'document.pdf', { type: 'application/pdf' });

// Include files under the field name from your API trigger's input format
const result = await client.executeWorkflow('workflow-id', {
  input: {
    documents: [file],  // Field name must match your API trigger's file input field
    instructions: 'Process this document'
  }
});

// Browser: From file input
const handleFileUpload = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);

  const result = await client.executeWorkflow('workflow-id', {
    input: {
      attachments: files,  // Field name must match your API trigger's file input field
      query: 'Analyze these files'
    }
  });
};
```

## Management (Workflows & Projects)

Beyond execution, the SDK can **manage** your workflows and projects — create, update, deploy,
delete, and organize them into folders. These routes live on the **app host**, so point the
client at `https://app.mybotbox.com`:

```typescript
const client = new MyBotBoxClient({
  apiKey: process.env.MYBOTBOX_TOKEN,
  baseUrl: 'https://app.mybotbox.com',
});

const wf = await client.createWorkflow({ name: 'Lead enricher', workspaceId: 'ws_123' });
await client.deployWorkflow(wf.id);
await client.executeWorkflow(wf.id, { input: { email: 'new@lead.com' } });
```

Workflow methods: `listWorkflows`, `getWorkflow`, `createWorkflow`, `updateWorkflow`,
`moveWorkflow`, `deleteWorkflow`, `restoreWorkflow`, `duplicateWorkflow`, `deployWorkflow`.

Project/folder methods (a project is a top-level folder): `listProjects`, `listFolders`,
`createFolder`, `updateFolder`, `deleteFolder`.

Each method requires a **token scope** (`workflow:read`, `workflow:write`, `workflow:deploy`,
`project:read`, `project:write`, …). A full-access key passes all of them; a scoped key that's
missing one gets a `403` with `code: 'INSUFFICIENT_SCOPE'`:

```typescript
import { MyBotBoxError } from '@yarlisai/studio-sdk';

try {
  await client.deployWorkflow(id);
} catch (e) {
  if (e instanceof MyBotBoxError && e.code === 'INSUFFICIENT_SCOPE') {
    // Use a key that holds workflow:deploy
  }
}
```

See the [Management API docs](https://mybotbox.com/docs/sdks/typescript#management-api)
and [Authentication & API keys](https://mybotbox.com/docs/sdks/authentication) for the full method
list and scope reference.

## Getting Your API Key

1. Log in to your [MyBotBox](https://app.mybotbox.com) account
2. Open **Settings → API keys** and create a personal key (optionally narrow it to specific
   [scopes](https://mybotbox.com/docs/sdks/authentication#token-scopes)), or let the
   [`mybotbox` CLI](https://mybotbox.com/docs/framework/cli) mint one with `mybotbox auth login`
3. Copy the key once and store it as an environment variable — never commit it

## Development

### Running Tests

To run the tests locally:

1. Clone the repository and navigate to the TypeScript SDK directory:

   ```bash
   cd packages/ts-sdk
   ```

2. Install dependencies:

   ```bash
   bun install
   ```

3. Run the tests:

   ```bash
   bun run test
   ```

### Building

Build the TypeScript SDK:

```bash
bun run build
```

This will compile TypeScript files to JavaScript and generate type declarations in the `dist/` directory.

### Development Mode

For development with auto-rebuild:

```bash
bun run dev
```

## Requirements

- Node.js 18+
- TypeScript 5.0+ (for TypeScript projects)

## License

Apache-2.0
