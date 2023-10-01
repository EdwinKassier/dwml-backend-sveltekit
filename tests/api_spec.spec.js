import { test, expect } from '@playwright/test'
 
test('UI render test', async ({ page }) => {
  // Start from the index page (the baseURL is set via the webServer in the playwright.config.ts)
  await page.goto('/');
  // Get the text content of the h1 element
  const h1Text = await page.textContent('h1');

  // Define the expected text
  const expectedText = "Welcome to Edwin's SvelteKit API";

  expect(h1Text).toContain(expectedText);
})


test('Test api - all valid', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
      symbol: 'ETH',
      investment: 123,
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result.SYMBOL).toBe('ETH')
  expect(responseBody.result.NUMBERCOINS).toBeGreaterThan(0)

  expect(JSON.parse(responseBody.graph_data).length).toBeGreaterThanOrEqual(1)

})


test('Test api - invalid symbol', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
      symbol: 123,
      investment: 123,
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result).toBe("Symbol doesn't exist")

})

test('Test api - no symbol', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
      investment: 123,
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result).toBe("Symbol doesn't exist")

})


test('Test api - invalid investment', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
      symbol: 'ETH',
      investment: 'ETH',
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result).toBe("Invalid investment amount")
  expect(responseBody.graph_data).toBe("Invalid investment amount")

})

test('Test api - no investment', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
      symbol: 'ETH',
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result).toBe("Invalid investment amount")
  expect(responseBody.graph_data).toBe("Invalid investment amount")

})


test('Test api - no args', async ({ request }) => {
  const newIssue = await request.get(`api/process_request`, {
    params: {
    }
  });
  expect(newIssue.ok());

  const responseBody =  JSON.parse(await newIssue.text())

  expect(responseBody.result).toBe("Symbol doesn't exist")
  expect(responseBody.graph_data).toBe("Symbol doesn't exist")

})