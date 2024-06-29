// tests/sitetracker-automation.spec.js
const {test, expect} = require('@playwright/test');

// Function to format date
const formatDate = (date) => {
    const options = {year: 'numeric', month: 'short', day: 'numeric'};
    return new Date(date).toLocaleDateString('en-US', options);
};

async function getDescriptionForTask(page, taskTitle) {
    return await page.evaluate((taskTitle) => {
        const taskElements = document.querySelectorAll('li.Task');
        for (const taskElement of taskElements) {
            if (taskElement.querySelector(`lightning-icon[title="Details for ${taskTitle}"]`)) {
                const descriptionElement = taskElement.querySelector('.description');
                return descriptionElement ? descriptionElement.textContent : '';
            }
        }
        return '';
    }, taskTitle);
}

// Function to click the .slds-icon-utility-down element for a given task title
async function clickMoreOptionsIconForTask(page, taskTitle) {
    return await page.evaluate((taskTitle) => {
        const taskElements = document.querySelectorAll('li.Task');
        for (const taskElement of taskElements) {
            if (taskElement.querySelector(`lightning-icon[title="Details for ${taskTitle}"]`)) {
                const iconElement = taskElement.querySelector('.slds-icon-utility-down');
                if (iconElement) {
                    iconElement.click(); // Click the icon
                    return true; // Indicate that the icon was found and clicked
                }
            }
        }
        return false; // Indicate that the icon was not found
    }, taskTitle);
}

// Function to click .showMoreButton as long as it's displayed
async function clickShowMoreUntilHidden(page) {
    while (await page.locator('.showMoreButton').isVisible()) {
        await page.click('.showMoreButton');
        await page.waitForTimeout(1000); // Add a short wait to allow for content loading
    }
}

test('Salesforce Login and Task Automation', async ({page}) => {
    // Step 1: Login to Salesforce
    await page.goto('https://sitetracker-1a-dev-ed.develop.my.salesforce.com');
    await page.fill('input[name="username"]', 'qa-auto@sitetracker.com');
    await page.fill('input[name="pw"]', 'Test123$');
    await page.click('input[name="Login"]');

    // Step 2: Navigate to Home Page
    await page.waitForNavigation();
    await expect(page).toHaveTitle(/Home/);

    // Step 3: Open the Apps menu and navigate to 'Leads'
    await page.click('button.slds-show');
    await page.fill('input.slds-input[type="search"]', "leads");
    await page.click('a[data-label="Leads"]');

    // Step 4: Ensure 'My Leads' view and apply filter
    await expect(page).toHaveTitle(/Lead/);
    await page.click('button[title="Show filters"]');
    await page.click('div#LeadfilterPanelDateCriterion');
    await page.locator('div.slds-dropdown-trigger input').nth(0).fill('Jan 1, 2024');
    await page.locator('div.slds-dropdown-trigger input').nth(1).fill(formatDate(new Date())); // Today's date
    await page.click('button.doneButton');
    await page.click('button[title="Close Filters"]');
    // Verify the count of leads
    const itemsCountText = await page.locator('span.countSortedByFilteredBy').textContent();
    expect(itemsCountText).toContain('22 items');

    // Step 5: Interact with a specific lead and create tasks
    await page.click('a[title="Betty Bair"]');
    const actualLeadName = await page.locator('lightning-formatted-name').innerText();
    expect(actualLeadName).toContain('Betty Bair');

    await page.click('a[data-tab-value="activityTab"]'); // Tap "Activity" tab

    await page.click('button[title="New Task"]'); // Tap "New Task" btn
    const summary1Title = `Create Budget Plan ${new Date().getTime()}` // Add timestamp for unique summary title
    await page.locator('input.slds-input').nth(0).fill(summary1Title); // Fill in Summary
    await page.locator('input.slds-input').nth(1).fill(formatDate(new Date())); // Fill in today's date
    await page.locator('a.select').nth(0).click(); // Open Status dropbox
    await page.click('a[title="In Progress"]'); // Tap "In Progress" option
    await page.click('button.cuf-publisherShareButton'); // Tap "Save"
    await page.waitForSelector('.toastMessage'); // Wait for the toast message to appear

    await page.click('button[title="New Task"]'); // Tap "New Task" btn
    const summary2Title = `Submit Budget Plan for Review ${new Date().getTime()}` // Add timestamp for unique summary title
    await page.locator('input.slds-input').nth(0).fill(summary2Title); // Fill in Summary
    await page.locator('input.slds-input').nth(1).fill(formatDate(new Date().setDate(new Date().getDate() + 7))); // Fill in one week from today date
    await page.locator('a.select').nth(0).click(); // Open Status dropbox
    await page.click('a[title="Not Started"]'); // Tap "Not Started" option
    await page.click('button.cuf-publisherShareButton'); // Tap "Save"
    await page.waitForSelector('.toastMessage'); // Wait for the toast message to appear

    // Step 6: Validate tasks
    await page.waitForSelector(`a.subjectLink[title="${summary1Title}"]`)
    expect(await page.locator(`a.subjectLink[title="${summary1Title}"]`).isVisible()).toBe(true); // Verify the 1st task is displayed
    await page.waitForSelector(`a.subjectLink[title="${summary2Title}"]`)
    expect(await page.locator(`a.subjectLink[title="${summary2Title}"]`).isVisible()).toBe(true); // Verify the 2nd task is displayed

    await page.click(`lightning-icon[title="Details for ${summary1Title}"]`); // Expand the 1st task
    expect(await getDescriptionForTask(page, summary1Title)).toBe(''); // Verify the description is empty

    await clickMoreOptionsIconForTask(page, summary1Title); // Click More Options Icon for the 1st task
    await page.click('a[title="Edit Comments"]'); // Click Edit Comments option
    const descriptionNewValue = 'Budget for Q4'
    await page.fill('textarea[role="textbox"]', descriptionNewValue); // Enter new description
    await page.click('button.cuf-publisherShareButton'); // Click Save button

    await page.click(`lightning-icon[title="Details for ${summary1Title}"]`); // Expand the 1st task
    expect(await getDescriptionForTask(page, summary1Title)).toBe(descriptionNewValue); // Verify the description matches the new value

    // Step 7: Adjust filters and validate display
    await page.click('button.filterMenuLink'); // Click the gear icon
    await page.click('label[for="dateFilter1"]'); // Click "Next 7 days" filter
    await page.click('.slds-button_brand'); // Click Apply button

    await page.waitForSelector(`a.subjectLink[title="${summary1Title}"]`)
    expect(await page.locator(`a.subjectLink[title="${summary1Title}"]`).isVisible()).toBe(true); // Verify the 1st task is displayed
    expect(await page.locator(`a.subjectLink[title="${summary2Title}"]`).isVisible()).toBe(false); // Verify the 2nd task is no longer displayed

    await page.click('.slds-button_brand'); // Click Show All Activities button
    await clickShowMoreUntilHidden(page); // Click "Show More" button until it's no longer displayed
    await page.waitForSelector(`a.subjectLink[title="${summary1Title}"]`)
    expect(await page.locator(`a.subjectLink[title="${summary1Title}"]`).isVisible()).toBe(true); // Verify the 1st task is displayed
    expect(await page.locator(`a.subjectLink[title="${summary2Title}"]`).isVisible()).toBe(true); // Verify the 2nd task is displayed
});
