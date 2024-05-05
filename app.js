const { getBrowser, getRandomElement, delay, checkMemoryUsage, getCpuUsagePercentage, downloadImages } = require('./utils')
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

          let html = await page.content();
          let $ = await cheerio.load(html);

          const colors = $('#ContentPlaceHolder1_d_desc_colors_main > div > img')
               .map((i, e) => $(e).attr('title'))
               .get();

          if(colors.length){

               for(const color of colors){
                    const data = {};
                    data["title"] = `${$('#ContentPlaceHolder1_d_product_title > span').length ? $('#ContentPlaceHolder1_d_product_title > span').text().trim() : ""}  ${color} `;
                    data["category"] = $('notFound').last().length
                         ? $('notFound').last()
                              .map((i, a) => $(a).text().trim()).get().join(" > ")
                         : "";
          
                    data["brand"] = 'صنایع روشنایی بلان'
          
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
                    const rowElements = $('.S_Products_Detail_Desc_Text_Item')
                    for (let i = 0; i < rowElements.length; i++) {
                         const row = rowElements[i];
                         const rowString = $(row).text()?.trim();
                         if(rowString?.includes(":")){
                              const key = rowString.split(':')[0]?.trim()
                              const value = rowString.split(':')[1]?.trim()
                              specification[key] = value;
                         }
                    }
                    specification = omitEmpty(specification);
                    const specificationString = Object.keys(specification).map((key) => `${key} : ${specification[key]}`).join("\n");
          
                    // descriptionString
                    const descriptionString = $('notFound')
                         .map((i, e) => $(e).text()?.trim())
                         .get()
                         .join('/n');
          
                    // Generate uuidv4
                    const uuid = uuidv4().replace(/-/g, "");
          
                    // Download Images
                    let imagesUrls = $('.S_Products_Detail_Slide_Item > center > img')
                         .map((i, img) => $(img).attr("src").replace(/(-[0-9]+x[0-9]+)/g, "")).get();
          
                    const otherImages = $('.S_Products_Detail_Tech_Info_Pic_File')
                         .map((i, img) => $(img).attr("src").replace(/(-[0-9]+x[0-9]+)/g, "")).get();
                    imagesUrls.push(...otherImages)

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
          
                    await insertProduct(insertQueryInput)
               }
               
               return "";
          }
          else{
               const data = {};
               data["title"] = $('notFound').length ? $('notFound').text().trim() : "";
               data["category"] = $('notFound').last().length
                    ? $('notFound').last()
                         .map((i, a) => $(a).text().trim()).get().join(" > ")
                    : "";
     
               data["brand"] = $('notFound').text()?.trim() || '';
     
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
               const rowElements = $('notFound')
               for (let i = 0; i < rowElements.length; i++) {
                    const row = rowElements[i];
                    const key = $(row).find('> th:first-child').text()?.trim()
                    const value = $(row).find('> td > p').map((i, p) => $(p)?.text()?.trim()).get().join('\n');
                    specification[key] = value;
               }
               specification = omitEmpty(specification);
               const specificationString = Object.keys(specification).map((key) => `${key} : ${specification[key]}`).join("\n");
     
               // descriptionString
               const descriptionString = $('notFound')
                    .map((i, e) => $(e).text()?.trim())
                    .get()
                    .join('/n');
     
               // Generate uuidv4
               const uuid = uuidv4().replace(/-/g, "");
     
               // Download Images
               let imagesUrls = $('notFound') 
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
     
               await insertProduct(insertQueryInput)
     
               return productExcelDataObject;

          }
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
          const DATA_DIR = path.normalize(__dirname + "/blanLighting");
          const IMAGES_DIR = path.normalize(DATA_DIR + "/images");
          const DOCUMENTS_DIR = path.normalize(DATA_DIR + "/documents");


          // Create SteelAlborz Directory If Not Exists
          if (!fs.existsSync(DATA_DIR)) { fs.mkdirSync(DATA_DIR); }
          if (!fs.existsSync(DOCUMENTS_DIR)) { fs.mkdirSync(DOCUMENTS_DIR); }
          if (!fs.existsSync(IMAGES_DIR)) { fs.mkdirSync(IMAGES_DIR); }

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


          // get product page url from db
          await scrapSingleProduct(page, urlRow.url, IMAGES_DIR, DOCUMENTS_DIR);
               
          await insertUrlToVisited(urlRow?.url);
               
     }
     catch (error) {
          console.log("Error In main Function", error);
          await insertUrlToProblem(urlRow?.url);
     }
     finally {
          // Close page and browser
          console.log("End");
          await page.close();
          await browser.close();
          await delay(1000);
     }
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

let usageMemory = (os.totalmem() - os.freemem()) / (1024 * 1024 * 1024);
let memoryUsagePercentage = checkMemoryUsage();
let cpuUsagePercentage = getCpuUsagePercentage();

if (memoryUsagePercentage <= 85 && cpuUsagePercentage <= 80 && usageMemory <= 28) {
     main();
}
else {
     const status = `status:
     memory usage = ${usageMemory}
     percentage of memory usage = ${memoryUsagePercentage}
     percentage of cpu usage = ${cpuUsagePercentage}\n`

     console.log("main function does not run.\n");
     console.log(status);
}






