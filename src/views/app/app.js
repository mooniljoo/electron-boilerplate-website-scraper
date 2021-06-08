const { ipcRenderer } = require("electron");
const puppeteer = require("puppeteer");
const rootPath = require("electron-root-path").rootPath;

let boolRunning = true;

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("Scraper DOM fully loaded");
  document.getElementById("input_dirPath").value = rootPath;
});

function openDialogMsg(msg) {
  ipcRenderer.sendSync("openDialogMsg", msg);
}
function openDialogError(msg) {
  ipcRenderer.sendSync("openDialogError", msg);
}
function setLoading() {
  document.getElementById("stateMsg").innerText = "불러오는 중입니다...";
  document.querySelector(".state").classList.add("on");
  document.getElementById("btnRunning").classList.add("disabled");
  document.getElementById("btnSelectDirPath").classList.add("disabled");
  document.getElementById("btnCancel").classList.remove("disabled");
  document.getElementById("btnCancel").classList.remove("disabled");
  let = allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  for (let i = 0; i < allCheckbox.length; i++) {
    allCheckbox[i].setAttribute("disabled", "disabled");
  }
}
function unsetLoading() {
  document.querySelector(".state").classList.remove("on");
  document.getElementById("btnRunning").classList.remove("disabled");
  document.getElementById("btnSelectDirPath").classList.remove("disabled");
  document.getElementById("btnCancel").classList.add("disabled");
  let = allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  for (let i = 0; i < allCheckbox.length; i++) {
    allCheckbox[i].removeAttribute("disabled");
  }
}

function onCancel(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  // show msg to screen for user
  document.getElementById("stateMsg").innerText = "취소중입니다...";
  boolRunning = false;
}

function openDialogFile() {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  // send to Main Process
  let resp = ipcRenderer.sendSync("openDialogFile", rootPath);
  // recv to Main Process
  if (resp.filePaths[0] != undefined)
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
function getArrAuction() {
  allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  let arrAuction = [];

  for (let i = 0; i < allCheckbox.length; i++) {
    if (allCheckbox[i].checked) {
      arrAuction.push(allCheckbox[i].value);
    }
  }
  if (arrAuction.length == 0) {
    let msg = "적어도 경매를 하나는 선택해야 합니다.";
    console.log(msg);
    openDialogMsg(msg);
    return null;
  }
  return arrAuction;
}

async function scraper(url) {
  // set loading state
  setLoading();
  // init variables
  const arrAuction = getArrAuction();
  const arrClosedAuction = [];
  const arrOpenedAuction = [];
  const arrSuccessfulAuctionsSaved = [];
  const arrFailedAuctionsSaved = [];
  // check for auctions to scrape
  if (arrAuction == null) return false;

  // ready for browser
  const browser = await configureBrowser();
  const page = await browser.newPage();
  //access the website
  await page.goto(url, { waitUntil: "domcontentloaded" });

  ///////////////// LOOPS /////////////////
  console.log("BROWSER IS READY. LOOPS ARE ABOUT TO START!");
  //DEPTH 1 : auction
  let auctionIndex = 0;
  let auctionCount = 1;
  while (boolRunning) {
    let auctionResult = [];
    console.log(`before auction : ${auctionIndex}`);
    if (auctionIndex == auctionCount) break;
    console.log(`after auction : ${auctionIndex}`);
    //DEPTH 2 : pagination
    let paginationIndex = 0;
    let paginationCount = 1;
    while (boolRunning) {
      console.log(`before pagination : ${paginationIndex}`);
      if (paginationIndex == paginationCount) break;
      console.log(`after pagination : ${paginationIndex}`);
      // parsing outer description of artwork
      let outerDesc = { auctionTitle: "옥션", transactDate: "2020.00.00" }; //dummyData
      //DEPTH 3 : artwork
      let artworkIndex = 0;
      let artworkCount = 5;
      while (boolRunning) {
        console.log(`before artwork : ${artworkIndex}`);
        if (artworkIndex == artworkCount) break;
        console.log(`after artwork : ${artworkIndex}`);
        // parsing inner description of artwork
        await page.waitForTimeout(2000);
        // let innerDesc = await parsing(page);
        let innerDesc = {
          number: "000",
          artistKr: "아티스트명",
          artistEn: "artist",
          titleKr: "작품명",
          titleEn: "title",
        }; //dummyData
        description = { ...outerDesc, ...innerDesc };
        console.log(description);
        auctionResult.push(description);
        // displaying description
        await drawTableforDesc([description]);
        // go again
        // await page.goBack();
        artworkIndex++;
      }
      await page.waitForTimeout(1000);
      paginationIndex++;
    }
    console.log(`${arrAuction[0]}를 마쳤습니다.`);
    auctionIndex++;
    // arrAuction.shift();

    console.log(
      `${auctionResult.length}개의 작품이 ${arrAuction[0]}경매에서 파싱되었습니다.`
    );
    // get directory path to save
    let dirPath = document.getElementById("input_dirPath").value;
    console.log(dirPath);
    if (auctionResult.length != 0) {
      // send to Main Process
      let resp = String(
        ipcRenderer.sendSync("createXlsxFile", auctionResult, dirPath)
      );
      // resc to Main Process
      if (!resp.includes("Error")) {
        //success
        arrSuccessfulAuctionsSaved.push(resp);
      } else {
        //fail
        arrFailedAuctionsSaved.push(resp);
      }
    }
  }
  console.log(
    "ALL LOOPS ARE OVER. A SCRAPER IS ABOUT TO TRY TO TERMINATE THE BROWSER."
  );
  ///////////////// LOOPS /////////////////

  // terminate browser
  browser.close();
  // unset loading state
  unsetLoading();
  //return result
  if (boolRunning) {
    return {
      arrOpenedAuction: arrOpenedAuction,
      arrClosedAuction: arrClosedAuction,
      arrSuccessfulAuctionsSaved: arrSuccessfulAuctionsSaved,
      arrFailedAuctionsSaved: arrFailedAuctionsSaved,
    };
  } else {
    //init toggleCancel
    boolRunning = true;
    return null;
  }
}
function validate() {
  allCheckbox = document.querySelectorAll(
    "#wrapper_checkbox input[type=checkbox]"
  );
  let arrAuction = [];

  for (let i = 0; i < allCheckbox.length; i++) {
    if (allCheckbox[i].checked) {
      arrAuction.push(allCheckbox[i].value);
    }
  }
  if (arrAuction.length == 0) {
    let msg = "적어도 경매를 하나는 선택해야 합니다.";
    console.log(msg);
    openDialogMsg(msg);
    return null;
  } else {
    return true;
  }
}
function onRunning(el) {
  //check this element is disabled or not
  if (el.classList.contains("disabled")) return;
  if (!validate()) return;
  console.log("RUN!");
  //init url
  let url = "https://www.seoulauction.com/";
  // run scrpaer
  scraper(url).then((res) => {
    console.log(`↓ SCRAPER RESULT ↓\n${res}`);
    //write message for user
    let msg = "";
    if (res == null) {
      msg = `취소되었습니다.`;
    } else {
      if (res.arrOpenedAuction.length != 0) {
        msg = `열려있는 경매가 없습니다.`;
      } else if (
        res.arrOpenedAuction.length > 0 &&
        res.arrSuccessfulAuctionsSaved.length != 0
      ) {
        msg = `${res.arrSuccessfulAuctionsSaved}경매 파일저장이 완료되었습니다.`;
        if (res.arrClosedAuction.length != 0)
          msg += `\n${res.arrClosedAuction}경매 는 아직 열려있지 않습니다.`;
      } else if (res.arrOpenedAuction.length == 0) {
        msg = `\n열려있는 경매가 없습니다.`;
      } else {
        msg = `ERROR: 결과를 분석할수 없습니다. \n${res}`;
      }
    }
    //report result for user
    openDialogMsg(msg);
  });
}

function drawTableforDesc(arr) {
  const tbody = document.getElementById("tbody");
  arr.forEach((item) => {
    tbody.innerHTML += `
        <tr>
            <td>${item.number}</td>
            <td>${item.artistKr}</td>
            <td>${item.artistEn}</td>
            <td>${item.titleKr}</td>
            <td>${item.titleEn}</td>
            <td>${item.year}</td>
            <td>${item.certi}</td>
            <td>${item.sizeEdition}</td>
            <td>${item.materialKr}</td>
            <td>${item.materialEn}</td>
            <td>${item.signPosition}</td>
            <td>${item.source}</td>
            <td>${item.auctionTitle}</td>
            <td>${item.transactDate}</td>
            <td>${item.winningBidUnit}</td>
            <td>${item.winningBid}</td>
            <td>${item.estimateUnit}</td>
            <td>${item.estimateMin}</td>
            <td>${item.estimateMax}</td>
        </tr>
`;
  });
}
