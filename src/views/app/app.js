const { ipcRenderer } = require("electron");
const puppeteer = require("puppeteer");
const fs = require("fs");

toggleCancel = true;

function onCancel() {
  console.log("press the cancel btn");
  toggleCancel = false;
  console.log("취소");
}

function onSelectDirPath() {
  let resp = ipcRenderer.sendSync("onSelectDirPath");
  console.log(resp);
  document.getElementById("input_dirPath").value = resp.filePaths[0];
}

async function configureBrowser() {
  const browser = await puppeteer.launch({
    devtools: true,
    headless: false,
    defaultViewport: null,
    args: ["--window-size=1280,1080"],
  });
  return browser;
}

async function scraper() {
  const browser = await configureBrowser();
  const page = await browser.newPage();
  await page.goto("https://naver.com", { waitUntil: "domcontentloaded" });

  console.log(browser);
  let i = 0;
  while (toggleCancel) {
    console.log(`before pagination : ${i}`);
    if (i == 1) break;
    console.log(`after pagination : ${i}`);
    let t = 0;
    while (toggleCancel) {
      console.log(`before artwork : ${t}`);
      if (t == 3) break;
      console.log(`after artwork : ${t}`);
      await page.waitForTimeout(1000);
      t++;
    }
    await page.waitForTimeout(3000);

    i++;
  }
  browser.close();
  console.log(browser);
}
function onSubmit() {
  console.log("run");
  toggleCancel = true;
  scraper().then((res) => console.log(res));
}
