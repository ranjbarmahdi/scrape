const { getBrowser, getRandomElement, delay, checkMemoryCpu, downloadImages } = require('./utils')
const omitEmpty = require('omit-empty');
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const db = require('./config.js');
const path = require("path");
const fs = require("fs");
const os = require('os');
const { CLIENT_RENEG_LIMIT } = require('tls');
// const cron = require('node-cron');
// const CronJob = require('cron').CronJob;


// ============================================ existsUrl
async function existsUrl() {
     const existsQuery = `
        SELECT * FROM unvisited u 
        limit 1
    `
     try {
          const urlRow = await db.oneOrNone(existsQuery);
          if (urlRow) return true;
          return false;
     } catch (error) {
          console.log("we have no url", error);
     }
}


// ============================================ removeUrl
async function removeUrl() {
     const existsQuery = `
        SELECT * FROM unvisited u 
        limit 1
    `
     const deleteQuery = `
          DELETE FROM unvisited 
          WHERE id=$1
     `
     try {
          const urlRow = await db.oneOrNone(existsQuery);
          if (urlRow) {
               await db.query(deleteQuery, [urlRow.id])
          }
          return urlRow;
     } catch (error) {
          console.log("we have no url", error);
     }
}


// ============================================ insertProduct
async function insertProduct(queryValues) {
     const query = `
          insert into products ("url", "xpath", "specifications", "description", "price", "unitofmeasurement", "category", "brand", "sku", "name", "row")
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     `;

     try {
          const result = await db.oneOrNone(query, queryValues);
          return result;
     } catch (error) {
          console.log("Error in insertProduct :", error.message);
     }
}


// ============================================ insertUrlToProblem
async function insertUrlToProblem(url) {
     const existsQuery = `
        SELECT * FROM problem u 
        where "url"=$1
    `

     const insertQuery = `
        INSERT INTO problem ("url")
        VALUES ($1)
        RETURNING *;
    `
     const urlInDb = await db.oneOrNone(existsQuery, [url])
     if (!urlInDb) {
          try {
               const result = await db.query(insertQuery, [url]);
               return result;
          } catch (error) {
               console.log(`Error in insertUrlToProblem  function : ${url}\nError:`, error.message);
          }
     }
}


// ============================================ insertUrlToVisited
async function insertUrlToVisited(url) {
     const existsQuery = `
        SELECT * FROM visited u 
        where "url"=$1
    `

     const insertQuery = `
        INSERT INTO visited ("url")
        VALUES ($1)
        RETURNING *;
    `
     const urlInDb = await db.oneOrNone(existsQuery, [url])
     if (!urlInDb) {
          try {
               const result = await db.query(insertQuery, [url]);
               return result;
          } catch (error) {
               console.log(`Error in insertUrlToVisited function : ${url}\nError:`, error.message);
          }
     }
}


// ============================================ scrapSingleProduct
async function scrapSingleProduct(page, productURL, imagesDIR, documentsDir, rowNumber = 1) {
     try {
          console.log(`======================== Start scraping : \n${productURL}\n`);
          await page.goto(productURL, { timeout: 180000 });

          await delay(5000);

          const html = await page.content();
          const $ = await cheerio.load(html);

          
          const title = $('h1.product_title').length ? $('h1.product_title').text().trim() : "";
          let names = [title];
          
          const colors = $('ul[data-attribute_name="attribute_pa_color"] > li')
               .map((i, c) => $(c).attr('title')?.trim())
               .get();

          const sizes = $('ul[data-attribute_name="attribute_pa_size"] > li')
               .map((i, c) => $(c).attr('title')?.trim())
               .get();

          const usage = $('ul[data-attribute_name="attribute_pa_product-usage"] > li')
               .map((i, c) => $(c).attr('title')?.trim())
               .get();

          if (sizes.length > 0) {
               let newNames = [];
               sizes.forEach(size => {
                    names.forEach(name => {
                         newNames.push(`${name} سایز ${size}`);
                    });
               });
               // Clear the list of previous names and add the newly generated names
               names = newNames;
           }

          if (colors.length > 0) {
               let newNames = [];
               colors.forEach(color => {
                    names.forEach(name => {
                         newNames.push(`${name} رنگ ${color}`);
                    });
               });
               // Clear the list of previous names and add the newly generated names
               names = newNames;
          }


          if (usage.length > 0) {
               let newNames = [];
               usage.forEach(u => {
                    names.forEach(name => {
                         newNames.push(`${name} (${u})`);
                    });
               });
               // Clear the list of previous names and add the newly generated names
               names = newNames;
           }


          for(const name of names){
               const data = {};
               data["title"] = name;
               data["category"] = $('a.breadcrumb-link breadcrumb-link-last').last().length
                    ? $('a.breadcrumb-link breadcrumb-link-last').last()
                         .map((i, a) => $(a).text().trim()).get().join(" > ")
                    : "";
     
               data["brand"] = $('ul[data-attribute_name="attribute_pa_brand"] > li:first').text()?.trim() || '';
     
               data['unitOfMeasurement'] = 'عدد'
               data["price"] = "";
               data["xpath"] = "";
     
               const offPercent = $('notFound').get()
               if (offPercent.length) {
                    data["price"] = $('notFound').text().replace(/[^\u06F0-\u06F90-9]/g, "")
                    data["xpath"] = "";
               }
               else {
                    data["price"] = $('notFound').first().text().replace(/[^\u06F0-\u06F90-9]/g, "");
                    data["xpath"] = '';
               }
     
               // specification, specificationString
               let specification = {};
               const rowElements = $('.woocommerce-product-details__short-description p')
               for (let i = 0; i < rowElements.length; i++) {
                    const row = rowElements[i];
                    const rowString = $(row).text()?.trim();
                    if(rowString.includes(':')){
                         const key = rowString.split(':')[0]?.trim();
                         const value = rowString.split(':')[1]?.trim();
                         specification[key] = value;
                    }
               }
               specification = omitEmpty(specification);
               const specificationString = Object.keys(specification).map((key) => `${key} : ${specification[key]}`).join("\n");
     
               // descriptionString
               const descriptionString = $('#tab-description > div > p')
                    .map((i, e) => $(e).text()?.trim())
                    .get()
                    .filter(d => d?.trim())
                    .join('/n');
     
               // Generate uuidv4
               const uuid = uuidv4().replace(/-/g, "");
     
               // Download Images
               let imagesUrls = $('.product-images-inner .woocommerce-product-gallery img') 
                    .map((i, img) => $(img).attr("src").replace(/(-[0-9]+x[0-9]+)/g, "")).get();
     
               imagesUrls = Array.from(new Set(imagesUrls));
               await downloadImages(imagesUrls, imagesDIR, uuid)
     
     
               // download pdfs
               let pdfUrls = $('NotFound').map((i, e) => $(e).attr('href')).get().filter(href => href.includes('pdf'))
               pdfUrls = Array.from(new Set(pdfUrls))
               for (let i = 0; i < pdfUrls.length; i++) {
                    try {
                         const pdfUrl = imagesUrls[i];
                         const response = await fetch(pdfUrl);
                         if (response.ok) {
                              const buffer = await response.buffer();
                              const localFileName = `${uuid}-${i + 1}.pdf`;
                              const documentDir = path.normalize(documentsDir + "/" + localFileName);
                              fs.writeFileSync(documentDir, buffer);
                         }
                    } catch (error) {
                         console.log("Error In Download Documents", error);
                    }
               }
     
               // Returning Tehe Required Data For Excel
               const productExcelDataObject = {
                    URL: productURL,
                    xpath: data["xpath"],
                    specifications: specificationString,
                    description: descriptionString,
                    price: data["price"],
                    unitOfMeasurement: data['unitOfMeasurement'],
                    category: data["category"],
                    brand: data["brand"],
                    SKU: uuid,
                    name: data["title"],
                    row: rowNumber
               };
     
               const insertQueryInput = [
                    productExcelDataObject.URL,
                    productExcelDataObject.xpath,
                    productExcelDataObject.specifications,
                    productExcelDataObject.description,
                    productExcelDataObject.price,
                    productExcelDataObject.unitOfMeasurement,
                    productExcelDataObject.category,
                    productExcelDataObject.brand,
                    productExcelDataObject.SKU,
                    productExcelDataObject.name,
                    productExcelDataObject.row
               ];
     
               await insertProduct(insertQueryInput);
               await delay(200)
          } 


          return '';
     } catch (error) {
          console.log("Error In scrapSingleProduct in page.goto", error);
          await insertUrlToProblem(productURL);
          return null;
     }

}


// ============================================ Main
async function main() {
     let urlRow;
     let browser;
     let page;
     try {
          const DATA_DIR = path.normalize(__dirname + "/htn");
          const IMAGES_DIR = path.normalize(DATA_DIR + "/images");
          const DOCUMENTS_DIR = path.normalize(DATA_DIR + "/documents");


          // Create SteelAlborz Directory If Not Exists
          if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR); }
          if (!fs.existsSync(DOCUMENTS_DIR)) { fs.mkdirSync(DOCUMENTS_DIR); }
          if (!fs.existsSync(IMAGES_DIR)) { fs.mkdirSync(IMAGES_DIR); }

          // get product page url from db
          urlRow = await removeUrl();

          if (urlRow?.url) {

               // get random proxy
               const proxyList = [''];
               const randomProxy = getRandomElement(proxyList);

               // Lunch Browser
               browser = await getBrowser(randomProxy, true, false);
               page = await browser.newPage();
               await page.setViewport({
                    width: 1920,
                    height: 1080,
               });
               
               await scrapSingleProduct(page, 'https://htnprime.com/product/plate-handle-1700/', IMAGES_DIR, DOCUMENTS_DIR);
               
               await insertUrlToVisited(urlRow?.url);
          }

     }
     catch (error) {
          console.log("Error In main Function", error);
          await insertUrlToProblem(urlRow?.url);
     }
     finally {
          // Close page and browser
          console.log("End");
          if(page) await page.close();
          if(browser) await browser.close();
          await delay(Math.random()*3000);
     }
}


// ============================================ run_1
async function run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory){
     if (checkMemoryCpu(memoryUsagePercentage, cpuUsagePercentage, usageMemory)) {
          await main();
     }
     else {
          const status = `status:
          memory usage = ${usageMemory}
          percentage of memory usage = ${memoryUsagePercentage}
          percentage of cpu usage = ${cpuUsagePercentage}\n`
     
          console.log("main function does not run.\n");
          console.log(status);
     }
}


// ============================================ run_2
async function run_2(memoryUsagePercentage, cpuUsagePercentage, usageMemory){
     let urlExists;

     do {
         
          urlExists = await existsUrl();
          if(urlExists){
               await run_1(memoryUsagePercentage, cpuUsagePercentage, usageMemory);
          }

     } while (urlExists);
}


// ============================================ Job

// stopTime = 8000
// let job = new CronJob('*/3 * * * * *', async () => {

//      console.log("cron");
//      let usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024); 
//      let memoryUsagePercentage = checkMemoryUsage();
//      let cpuUsagePercentage = await getCpuUsagePercentage();


//      if (usageMemory >= 13 || cpuUsagePercentage >= 90) {
//           console.log("=========================================");
//           console.log(`job stopped for ${stopTime} ms`);
//           job.stop();

//           setInterval(() => {
//                console.log(`Restarting cron job after ${stopTime} ms...`)
//                job.start();
//           }, stopTime)
//      } 


//      if (memoryUsagePercentage <= 80 && cpuUsagePercentage <= 85) {
//           main();
//           console.log("main");
//      }

// })

// job.start()


main();

