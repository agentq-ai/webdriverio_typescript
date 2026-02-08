# WebdriverIO TypeScript Integration with AgentQ AI

This project demonstrates how to integrate WebdriverIO (TypeScript) with AgentQ AI for AI-driven automation and automated test result reporting.

## Installation

Install the library in your WebdriverIO project:

```bash
npm install agentq-webdriverio
```

## Configuration

### 1. Environment Variables

Create json file `agentq.config.json` based on your account profile (you must signin first)
```json
{
  "TOKEN": "apiKey"
}
```

Create a `.env` file in your root directory and add your AgentQ credentials and project details:

```env
AGENTQ_PROJECT_ID=your-project-id
AGENTQ_TESTRUN_ID=your-testrun-id
AGENTQ_EMAIL=your-email@example.com
AGENTQ_PASSWORD=your-password
```

### 2. WebdriverIO Config (`wdio.conf.ts`)

Update your `wdio.conf.ts` to include the AgentQ hooks:

```typescript
import { initAgentQ, handleTestConclusion, uploadArtifact } from 'agentq-webdriverio';
import fs from 'fs';
import path from 'path';

const testResultIds: { [key: string]: string } = {};

export const config: WebdriverIO.Config = {
    // ... other config

    // Initialize AgentQ before the session starts
    before: function (capabilities, specs) {
        initAgentQ(browser);
    },

    // Report results and capture screenshots after each test
    afterTest: async function(test, context, { error, result, duration, passed, retries }) {
        const testResult = await handleTestConclusion(test.title, passed);
        
        if (testResult && testResult.id && process.env.AGENTQ_TESTRUN_ID) {
            testResultIds[test.title] = testResult.id;

            // Capture and upload screenshot
            try {
                const timestamp = new Date().toISOString().replace(/:/g, '-');
                const screenshotPath = path.join('./test-results', `screenshot_${test.title}_${timestamp}.png`);
                await browser.saveScreenshot(screenshotPath);
                
                await uploadArtifact(
                    process.env.AGENTQ_TESTRUN_ID,
                    testResult.id,
                    'screenshot',
                    screenshotPath
                );
            } catch (err) {
                console.warn(`[AgentQ] Failed to capture/upload screenshot: ${err.message}`);
            }
        }
    },

    // Batch upload videos after the spec file is finished
    after: async function (result, capabilities, specs) {
        // Wait for video reporter to finalize files
        await new Promise(resolve => setTimeout(resolve, 10000));

        const resultsDir = './test-results';
        if (fs.existsSync(resultsDir)) {
            const files = fs.readdirSync(resultsDir);
            for (const title of Object.keys(testResultIds)) {
                const sanitizedTitle = title.replace(/\s+/g, '-').replace(/[()]/g, '');
                const matchingFiles = files
                    .filter(f => f.startsWith(sanitizedTitle) && f.endsWith('.webm'))
                    .map(f => ({ name: f, time: fs.statSync(path.join(resultsDir, f)).mtime.getTime() }))
                    .sort((a, b) => b.time - a.time);

                if (matchingFiles.length > 0 && process.env.AGENTQ_TESTRUN_ID) {
                    await uploadArtifact(
                        process.env.AGENTQ_TESTRUN_ID,
                        testResultIds[title],
                        'video',
                        path.join(resultsDir, matchingFiles[0].name)
                    );
                }
            }
        }
    }
};
```

## Usage

Import `q`, `test`, or `it` from `agentq-webdriverio` to write your tests.

### AI-Driven Test Example

Prefix your test titles with a Case ID (e.g., `17-`) to map the result to a specific test case in the AgentQ dashboard.

```typescript
import { q, test } from 'agentq-webdriverio';

describe('AI Automation Flow', () => {
    test('17-should login using AI instructions', async () => {
        await browser.url('https://the-internet.herokuapp.com/login');

        // Execute actions using natural language
        await q('user fill username tomsmith');
        await q('user fill password SuperSecretPassword!');
        await q('user click login button');

        // Standard assertions work normally
        const flashAlert = await $('#flash');
        await expect(flashAlert).toHaveText(
            expect.stringContaining('You logged into a secure area!')
        );
    });
});
```

## Running Tests

Run your tests using the `wdio` command:

```bash
npx wdio run ./wdio.conf.ts
```

To include environment variables (recommended):

```bash
source .env && npx wdio run ./wdio.conf.ts
```
