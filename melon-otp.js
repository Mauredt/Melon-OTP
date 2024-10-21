const { chromium } = require('playwright');
const fs = require('fs');
const readline = require('readline');
const chalk = require('chalk');

// Function to wait for a specific duration
function waitFor(seconds) {
  return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}

// Function to wait for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Function to wait for input and return it
function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// Function to display loading bar
function displayLoadingBar(step, totalSteps) {
  const barLength = 20; // Length of the loading bar
  const filledLength = Math.round((step / totalSteps) * barLength);
  const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);
  process.stdout.write(`\rProgress: [${bar}] ${step}/${totalSteps} |`);
}

(async () => {
  let successCount = 0;
  let failCount = 0;

  // Input 'Referral Number' from the user
  const referralNumber = parseInt(await askQuestion('Enter Referral Number: '), 10);

  const totalSteps = 10; // Total number of steps

  // Loop for each Referral Number
  for (let i = 1; i <= referralNumber; i++) {
    console.clear();
    process.stdout.write(chalk.yellow(`Running Referral (${i}/${referralNumber})\n\n`));
    process.stdout.write(chalk.green(`Success: ${successCount}\n`));
    process.stdout.write(chalk.red(`Fail: ${failCount}\n\n`));

    let browser; // Define browser here
    try {
      // Launch the browser in headless mode for each iteration
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext();
      
      let step = 0;

      // Step 1: Navigate to TempMail
      process.stdout.write(chalk.blue('Getting OTP Mail...\n'));
      const tempMailPage = await context.newPage();
      displayLoadingBar(++step, totalSteps);

      await tempMailPage.goto('https://tempmail.lol/en/');
      await tempMailPage.waitForLoadState('load');

      await waitFor(5); // Wait for 5 seconds after page load

      // Step 2: Get the temporary email address
      const emailElement = await tempMailPage.locator('xpath=//*[@id="app"]/div/main/div/div/div[1]/p');
      const tempEmail = await emailElement.innerText();

      fs.writeFileSync('melonMail.txt', tempEmail); // Save the email to melonMail.txt

      // Step 3: Open the second tab for Melon Games
      const melonPage = await context.newPage();
      displayLoadingBar(++step, totalSteps);

      await melonPage.goto('https://melongames.io/?invite=ZAHKIBMQ');
      await melonPage.waitForLoadState('load');

      // Step 4: Perform actions on Melon Games page
      process.stdout.write(chalk.green('Clicking on the first element...\n'));
      const firstElement = melonPage.locator('xpath=/html/body/main/div/div[1]/div[5]/div/div[1]/img');
      await firstElement.waitFor({ state: 'visible' });
      await firstElement.click();
      displayLoadingBar(++step, totalSteps);

      // Step 5: Fill the temp email into the input field
      const emailInput = melonPage.locator('xpath=//*[@id="w3a-modal"]/div/div[2]/div[2]/form/input');
      await emailInput.waitFor({ state: 'visible' });
      await emailInput.fill(tempEmail);
      displayLoadingBar(++step, totalSteps);

      // Step 6: Click the submit button
      const submitButton = melonPage.locator('xpath=//*[@id="w3a-modal"]/div/div[2]/div[2]/form/button');
      await submitButton.waitFor({ state: 'visible' });
      await submitButton.click();
      displayLoadingBar(++step, totalSteps);

      // Step 7: Wait for navigation to the verification page
      process.stdout.write(chalk.blue('Waiting for navigation to the verification page...\n'));
      await melonPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
      displayLoadingBar(++step, totalSteps);

      // Step 8: Switch back to TempMail
      process.stdout.write(chalk.yellow('Switching back to TempMail...\n'));
      await tempMailPage.bringToFront();
      await waitFor(5);
      displayLoadingBar(++step, totalSteps);

      // Step 9: Refresh TempMail page
      process.stdout.write(chalk.yellow('Refreshing TempMail page...\n'));
      await tempMailPage.reload(); // Refresh the TempMail page
      await tempMailPage.waitForLoadState('load');
      displayLoadingBar(++step, totalSteps);

      // Step 10: Wait for OTP email to appear (up to 30 seconds)
      process.stdout.write(chalk.magenta('Waiting for OTP email to appear (up to 30 seconds)...\n'));
      const emailCheckLocator = tempMailPage.locator('xpath=//*[@id="app"]/div/main/div/div/div[2]/div/div[2]/div/div');

      try {
        await emailCheckLocator.waitFor({ state: 'visible', timeout: 10000 });
        const otpTextElement = await tempMailPage.locator('xpath=//*[@id="app"]/div/main/div/div/div[2]/div/div[2]/div/div/p[2]');
        const otpText = await otpTextElement.innerText();
        const otpCode = otpText.match(/\d{6}/)[0];

        process.stdout.write(chalk.green(`OTP code retrieved: ${otpCode}\n`));
        displayLoadingBar(++step, totalSteps);

        // Step 11: Enter OTP code
        await melonPage.bringToFront();
        process.stdout.write(chalk.cyan('Entering OTP code...\n'));
        const verificationInput = melonPage.locator('xpath=//*[@id="app"]/div/div/div/div/div[3]/div/div[1]/input');
        await verificationInput.waitFor({ state: 'visible' });

        const digits = otpCode.split('');
        for (let i = 0; i < digits.length; i++) {
          const inputSelector = `//*[@id="app"]/div/div/div/div/div[3]/div/div[${i + 1}]/input`;
          const inputField = melonPage.locator(`xpath=${inputSelector}`);
          await inputField.waitFor({ state: 'visible' });
          await inputField.fill(digits[i]);
          await waitFor(1);
        }

        process.stdout.write(chalk.green('OTP successfully entered.\n'));
        await melonPage.waitForNavigation({ waitUntil: 'networkidle', timeout: 10000 });
        displayLoadingBar(++step, totalSteps);

        successCount++; // Increment success count
        process.stdout.write(chalk.green('Process completed successfully.\n'));

      } catch (error) {
        failCount++; // Increment fail count
        process.stdout.write(chalk.red('OTP email did not appear within 10 seconds.\n'));
        if (fs.existsSync('melonMail.txt')) {
          fs.unlinkSync('melonMail.txt'); // Delete the temp email file on failure
          process.stdout.write(chalk.magenta('melonMail.txt has been deleted.\n'));
        }
      }

      await tempMailPage.close();
      await melonPage.close();

    } catch (error) {
      failCount++; // Increment fail count for any other error
      process.stdout.write(chalk.red(`Error during iteration ${i}: ${error.message}\n`));
    } finally {
      if (browser) {
        await browser.close();
        process.stdout.write(chalk.yellow(`\nBrowser Closed ${i}.\n`));
      }
    }

    await waitFor(3); // Wait 3 seconds before the next iteration
  }

  process.stdout.write(chalk.green(`Referral process complete. Success: ${successCount}, Fail: ${failCount}\n`));
  rl.close(); // Close readline interface
})();
