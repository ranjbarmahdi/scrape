const cheerio = require("cheerio");
const { getBrowser, getRandomElement, shuffleArray, delay } = require('./utils')
const db = require('./config.js');


// ============================================ insertUrl
async function insertUrl(url) {
    const existsQuery = `
        SELECT * FROM unvisited u 
        where "url"=$1
    `

    const insertQuery = `
        INSERT INTO unvisited ("url")
        VALUES ($1)
        RETURNING *;
    `
    const urlInDb = await db.oneOrNone(existsQuery, [url])
    if (!urlInDb) {
        try {
            const result = await db.query(insertQuery, [url]);
            return result;
        } catch (error) {
            console.log(`Error in insert url function : ${url}\nError:`, error.message);
        }
    }
}


// ============================================ findAllMainLinks
async function findAllMainLinks(page, initialUrl) {
    const allMainLinks = [];
    try {
        const url = initialUrl;
        await page.goto(url, { timeout: 360000 });


        // sleep 5 second 
        console.log("-------sleep 5 second");
        await delay(5000);

        // load cheerio
        const html = await page.content();
        const $ = cheerio.load(html);

        // Getting All Main Urls In This Page
        // const mainLinks = $('#menu-categories > li > a')
        //     .map((i, a) => $(a).attr('href')?.trim()).get()

        const mainLinks = [
                "https://banihashemst.com/product-category/%d8%b4%db%8c%d8%b1%d8%a2%d9%84%d8%a7%d8%aa-%d8%b3%d8%a7%d8%ae%d8%aa%d9%85%d8%a7%d9%86%db%8c/",
                // "https://banihashemst.com/product-category/%d8%aa%d8%ac%d9%87%db%8c%d8%b2%d8%a7%d8%aa-%d8%a2%d8%b4%d9%be%d8%b2%d8%ae%d8%a7%d9%86%d9%87/",
                // "https://banihashemst.com/product-category/%d8%b3%d8%b1%d9%88%db%8c%d8%b3-%d8%a8%d9%87%d8%af%d8%a7%d8%b4%d8%aa%db%8c/",
                // "https://banihashemst.com/product-category/%d9%85%d8%ad%d8%b5%d9%88%d9%84%d8%a7%d8%aa-%d8%ac%d8%a7%d9%86%d8%a8%db%8c/"
            ]

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(...mainLinks);

    } catch (error) {
        console.log("Error In findAllMainLinks function", error.message);
    }

    return Array.from(new Set(allMainLinks));
}


// ============================================ findAllPagesLinks
async function findAllPagesLinks(page, mainLinks) {

    let allPagesLinks = []

    // find pagination and pages     
    for (let i = 0; i < mainLinks.length; i++) {
        try {
            const url = mainLinks[i];
            console.log("============================================================");
            console.log("start findind pages for main link :", url);
            await page.goto(url);

            await delay(5000);
            const html = await page.content();
            const $ = cheerio.load(html);

            // find last page number and preduce other pages urls

            for (let j = 1; j <= 5; j++) {
                const newUrl = `https://banihashemst.com/product-category/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA-%D8%AC%D8%A7%D9%86%D8%A8%DB%8C/page/${j}/?per_page=72`
                allPagesLinks.push(newUrl)
            }


        } catch (error) {
            console.log("Error in findAllPagesLinks", error);
        }
    }

    // allPagesLinks = shuffleArray(allPagesLinks)
    return Array.from(new Set(allPagesLinks))
}


// ============================================ findAllProductsLinks
async function findAllProductsLinks(page, allPagesLinks) {

    for (let i = 0; i < allPagesLinks.length; i++) {
        try {
            const url = allPagesLinks[i];
            console.log("============================================================");
            console.log("Start Finding products urls from page :", url);
            await page.goto(url, { timeout: 180000 });

            // sleep 5 second when switching between pages
            console.log("-------sleep 5 second");
            await delay(3000);

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);
                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = $('.wd-entities-title > a')
                    .map((i, e) => $(e).attr('href'))
                    .get()

                // insert prooduct links to unvisited
                for (let j = 0; j < productsUrls.length; j++) {
                    try {
                        const url = productsUrls[j];
                        await insertUrl(url);
                        await delay(100);
                    } catch (error) {
                        console.log("Error in findAllProductsLinks for loop:", error.message);
                    }
                }


                // nextPageBtn = await page.$$('a.next.page-numbers')
                nextPageBtn = await page.$$('nnnnnnnnnnnn')
                if (nextPageBtn.length) {
                    let btn = nextPageBtn[0];
                    await btn.click();
                }
                // await delay(3500);
            }
            while (nextPageBtn.length)
        } catch (error) {
            console.log("Error In findAllProductsLinks function", error);
        }
    }
}


// ============================================ Main
async function main() {
    try {
        const INITIAL_PAGE_URL = ['https://banihashemst.com/']

        // get random proxy
        const proxyList = [''];
        const randomProxy = getRandomElement(proxyList);

        // Lunch Browser
        const browser = await getBrowser(randomProxy, true, false);
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
        });


        for (const u of INITIAL_PAGE_URL) {
            const mainLinks = await findAllMainLinks(page, u)
            const AllPagesLinks = await findAllPagesLinks(page, mainLinks);
            await findAllProductsLinks(page, AllPagesLinks);
        }

        // Close page and browser
        console.log("End");
        await page.close();
        await browser.close();
    } catch (error) {
        console.log("Error In main Function", error);
    }
}

main();
