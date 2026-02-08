import { expect } from '@wdio/globals'
import { q, test } from 'agentq-webdriverio';

describe('AI-Driven Login', () => {
    test('1-should login with valid credentials using AI', async () => {
        await browser.url('https://the-internet.herokuapp.com/login')

        await q('user fill usernam`e tomsmith');
        await q('user fill password SuperSecretPassword!');
        await q('user click login button');

        const flashAlert = await $('#flash');
        await expect(flashAlert).toHaveText(
            expect.stringContaining('You logged into a secure area!'))
    })
})
