
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');
const prompt = require('prompt');
const fs = require('fs');

const switchRednBlue = 'https://www.bestbuy.com/site/nintendo-switch-32gb-console-neon-red-neon-blue-joy-con/6364255.p?skuId=6364255';
// const switchTurquoise = 'https://www.bestbuy.com/site/nintendo-switch-32gb-lite-turquoise/6257139.p?skuId=6257139';
const backgroundAction = false;
const checkingTime = 60 * 1000; // 60 seconds

let senderEmailAddress;
let emailPassword;
let receiverEmailAddress;
let period;

input();

async function input() {
  await enterEmail();

  console.log('\n');
  console.log('==============================');
  console.log('Current time is: ', new Date().toLocaleString('en-US'), '\n');
  console.log('Start a new round of scraping', '\n');
  start();
  const timer = setInterval(() => {
    console.log('\n');
    console.log('==============================');
    console.log('Current time is: ', new Date().toLocaleString('en-US'), '\n');
    if (updateTimeout(period)) {
      console.log('Start a new round of scraping', '\n');
      logger('Start a new round of scraping');
      start();
    }
  }, checkingTime);
}

async function start() {
  const browser = await puppeteer.launch({ 
    headless: backgroundAction, 
    defaultViewport: { width: 1280, height: 1200 },
  });

  const page = await browser.newPage();

  // Go to bestbuy
  console.log('Opening Bestbuy...');
  console.log('...');
  console.log('......');
  console.log('.........');
  const t0 = new Date().getTime();
  await page.goto(switchRednBlue, {
    timeout: 0,
    waitUntil: "load",
  });
  const t1 = new Date().getTime();
  console.log(`Takes ${(t1 - t0)/1000} seconds to open bestbuy`);
  console.log('------------------------------');

  // take screenshot
  await page.waitForSelector('.fulfillment-add-to-cart-button > div > button', { timeout: 0 });
  await page.screenshot({ path: 'page.png', clip: { x: 800, y: 700, width: 600, height: 500 } })

  // check if enabled, send email
  const isDisabled = await page.$eval('.fulfillment-add-to-cart-button > div > button', el => el.disabled );
  if (!isDisabled) {
    console.log('Nintendo switch might be available now!!');
    await email();
  } else {
    console.log('Nintendo switch is still not available...');
  }
  logger(`Switch availability is: ${!isDisabled}`);

  // send email anyway
  // await email();

  console.log('------------------------------', '\n');

  await browser.close();
  console.log('Web Scraping ended');
  console.log('==============================');
};

async function email(isTest = false) {
  var transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: senderEmailAddress,
      pass: emailPassword,
    }
  });
  
  var mailOptions = {
    from: senderEmailAddress,
    to: receiverEmailAddress,
    subject: isTest ? 'Sending test email...' : 'Buy Switch Now!!',
    text: 'check attachment',
    attachments: [{
      filename: 'switch.png',
      path: 'page.png',
    }],
  };
  
  if (isTest) console.log('Testing email...')
  else console.log('Sending email...');
  return await transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      if (isTest) console.log('Please check email address or password if they are correct!');
      console.log(error);
    } else {
      if (isTest) console.log('Email is working fine');
      console.log('Email sent: ' + info.response);
    }
  });
};

function updateTimeout(number) {
  const period = number === 60 ? 0 : number;
  return new Date().getMinutes() % period === 0;
}

function enterEmail() {
  return new Promise((resolve, reject) => {
    prompt.start();
    
    prompt.get([{
      name: 'sender_email_address',
      require: true,
    }, 
    {
      name: 'password',
      hidden: true,
      replace: '*',
      conform: function (value) {
      return true;
      }
    },
    {
      name: 'receiver_email_address',
      require: true,
    },
    {
      name: 'period',
      message: 'check status every __ minute, min:0, max: 60',
      default: 30,
    }], async (err, result) => {
      if (err) { return onErr(err); }
      senderEmailAddress = result['sender_email_address'];
      emailPassword = result['password'];
      receiverEmailAddress = result['receiver_email_address'];
      period = result.period;
      await email(true);
      resolve()
    });
    
    function onErr(err) {
      console.log(err);
      reject();
      return 1;
    }
  })
}

function logger(info) {
  const today = new Date().toISOString().split('T')[0];
  const time = new Date().toLocaleString();
  fs.appendFileSync(`logs/log-${today}`, info + ' at ' + time + '\n', err => {
    console.log(err);
  });
}