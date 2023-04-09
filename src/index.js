const puppeteer = require("puppeteer");
const readline = require("readline");

require("dotenv").config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

/**
 * Handling process end signal (ctrl+c)
 */
sigintHandler = () => {
  console.log("Bye bye.");
  process.exit();
};

rl.on("SIGINT", sigintHandler); // Register sigint handler

const imagesEnabled = false;
const login = process.env.LOGIN;
const psw = process.env.PASSWORD;

/**
 * Added some browser options because chrome was crashing
 */
const browserOptions = {
  ignoreHTTPSErrors: true,
  headless: false,
  slowMo: 5,
  defaultViewport: null,
  devtools: false,
  args: [
    "--unlimited-storage",
    "--full-memory-crash-report",
    "--disable-gpu",
    "--ignore-certificate-errors",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--lang=en-US;q=0.9,en;q=0.8",
    "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36",
  ],
};

const main = async () => {
  const browser = await puppeteer.launch(browserOptions);
  const page = await browser.newPage();

  await page.setRequestInterception(true);
  page.on("request", (request) => {
    if (!imagesEnabled && request.resourceType() === "image") request.abort();
    else request.continue();
  });

  await page.goto("https://badoo.com/signin/", { waitUntil: "networkidle0" });

  await page.type(".js-signin-login", login);
  await page.type(".js-signin-password", psw);
  await page.click(".new-form__actions .btn--block");

  const continueBtn = ".js-continue";

  const allowBtn = ".js-chrome-pushes-deny";

  // We pause waiting for the page to load
  await pauseFor(5000);
  let notificationsAccepted = false;

  while (true) {
    try {
      await doLike(page);
    } catch (e) {
      console.log(e.message);
    }
    try {
      await continueSession(page, continueBtn);
    } catch (e) {
      console.log(e.message);
    }
    if (!notificationsAccepted) {
      try {
        await acceptNotifications(page, allowBtn);
        notificationsAccepted = true;
      } catch (e) {
        console.log(e.message);
      }
    }
    await pauseFor(0);
  }
};

/**
 *
 * @param {*} page
 * Like using the keyboard, easier than click,
 * because click element can change.
 */
const doLike = async (page) => {
  await pauseFor(1000);
  await page.keyboard.press(1);
};

/**
 *
 * @param {*} page
 * @param {*} allowBtn
 * Badoo shows an alert after the first like after if you want to receive
 * notifications. This method dismiss that alert.
 */
const acceptNotifications = async (page, allowBtn) => {
  await page.waitForSelector(allowBtn, { timeout: 1000 });
  await page.click(allowBtn);
  await page.keyboard.press("Escape");
};

/**
 *
 * @param {*} page
 * @param {*} continueBtn
 * Badoo shows an alert if you are using the page/app in two devices
 * The purpose of this method if that if this alerts shows we dismiss it.
 */
const continueSession = async (page, continueBtn) => {
  await page.waitForSelector(continueBtn, { timeout: 200 });
  await page.click(continueBtn);
};

const pauseFor = async (miliseconds) => {
  await new Promise((_) => setTimeout(_, miliseconds));
};

process.on("SIGINT", () => {
  console.log("You clicked Ctrl+C!");
  process.exit(1);
});

(async function () {
  await main();
})();
