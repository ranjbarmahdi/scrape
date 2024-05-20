const { getBrowser, getRandomElement, delay, checkMemoryCpu, downloadImages } = require('./utils')
const omitEmpty = require('omit-empty');
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");
const cheerio = require("cheerio");
const db = require('./config.js');
const path = require("path");
const fs = require("fs");
const os = require('os');
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

          const headers = $('table.table-product')
               .find('> thead > tr > *')
               .map((i, e) => $(e).text()?.trim())
               .get() || [];

          const indexSpec = headers.findIndex(item => item?.includes('جزئیات'));
          const prosuctRows = $('table.table-product').find('> tbody > tr').get();
          
          if(indexSpec != -1){
               headers.splice(indexSpec, indexSpec+1);
          }
          const indexName = headers.findIndex(item => {
               if(item?.includes('نام') ||  item?.includes('عنوان') || item?.includes('نام')){
                    return true
               }
          });

          for(const productRow of prosuctRows){
               try {
                    const tds = $(productRow).find('>td').get()
                    if(indexSpec != -1){
                         tds.splice(indexSpec, indexSpec+1);
                    }
                    const data = {};
                    data["title"] = $(tds[indexName]).text().trim()
                    data["category"] = $('.breadcrumb > li:lt(-1):last').last().length
                         ? $('.breadcrumb > li:lt(-1):last').last()
                              .map((i, a) => $(a).text().trim()).get().join(" > ")
                         : "";
          
                    data["brand"] = $('.shop-title > div > h2').map((i, e) => {
                         if($(e).text().includes('برند')) {
                             return $(e).text().split(':')[1]?.trim()
                         }
                     }).get()[0] || ''
          
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
                    for (let i = 0; i < tds.length; i++) {
                         const td = tds[i];
                         const key = headers[i]?.trim();
                         const value = $(td)?.text()?.trim();
                         specification[key] = value;
                    }
                    specification = omitEmpty(specification);
                    const specificationString = Object.keys(specification).map((key) => `${key} : ${specification[key]}`).join("\n");
          
                    // descriptionString
                    const descriptionString = $('#product-des p')
                         .map((i, e) => $(e).text()?.trim())
                         .get()
                         .filter(p => p?.trim())
                         .join('/n');
          
                    // Generate uuidv4
                    const uuid = uuidv4().replace(/-/g, "");
          
                    // Download Images
                    let imagesUrls = $('.product-image img' )
                         .map((i, img) => 'https://tpciran.com' + $(img).attr("src").replace(/(-[0-9]+x[0-9]+)/g, "")?.replace('thumb2', 'thumb')?.replace('thumb', 'thumb2')).get();
          
                    imagesUrls = imagesUrls.map(url => url.includes('?v') ? url.split('?')[0] : url) 
                    imagesUrls = Array.from(new Set(imagesUrls));
                    await downloadImages(imagesUrls, imagesDIR, uuid)
          
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
               } catch (error) {
                    
               }

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
          const DATA_DIR = path.normalize(__dirname + "/tabarestan");
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
               
               await scrapSingleProduct(page, urlRow.url, IMAGES_DIR, DOCUMENTS_DIR);

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
          await delay(1000);
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



run_2(80, 80, 12)
