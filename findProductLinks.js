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
        const mainLinks = $('notFound')
            .map((i, a) => $(a).attr('href')?.trim()).get()

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(initialUrl);

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
            const paginationElement = $('notFound');
            console.log("Pagination Element : ", paginationElement.length);
            if (paginationElement.length) {

                let lsatPageNumber = $('notFound')?.last().text()?.trim();
                console.log("Last Page Number : ", lsatPageNumber);
                lsatPageNumber = Number(lsatPageNumber);
                for (let j = 1; j <= lsatPageNumber; j++) {
                    const newUrl = url + `?page=${j}`
                    allPagesLinks.push(newUrl)
                }
            }
            else {
                allPagesLinks.push(url)
            }

        } catch (error) {
            console.log("Error in findAllPagesLinks", error);
        }
    }

    allPagesLinks = shuffleArray(allPagesLinks)
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
            await delay(5000);

            let nextPageBtn;
            let c = 0;
            do {
                c++;
                console.log(c);
                const html = await page.content();
                const $ = cheerio.load(html);

                // Getting All Products Urls In This Page
                const productsUrls = [
                    'https://www.eefaceram.com/%DA%A9%D8%AF%2012%20%D9%82%D8%B7%D8%B9%D8%A7%D8%AA%20%D8%AA%D8%B2%D8%A6%DB%8C%D9%86%DB%8C/category/SURCZ1czUkhUM0U9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF-1-%D9%BE%D8%A7%D8%B1%DA%A9%DB%8C%D9%86%DA%AF%DB%8C%D8%8C-%D9%BE%D8%B4%D8%AA%20%D8%A8%D8%A7%D9%85%D8%8C-%D8%AA%D8%B1%D8%A7%D8%B3-%D9%88-%D9%BE%DB%8C%D8%A7%D8%AF%D9%87-%D8%B1%D9%88/category/aUR2Q0hHRVk3ME09/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%2011%20%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%20%D8%B3%D8%A7%D9%84%D9%86%20%D9%87%D8%A7%20%D8%8C%20%D9%BE%D8%B4%D8%AA%20%D8%AA%D8%AE%D8%AA%D8%AE%D9%88%D8%A7%D8%A8%20%D9%88%20%D9%86%D8%B4%DB%8C%D9%85%D9%86/category/OTRrTzFzekkvZXc9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%209%20%D9%85%D8%AD%DB%8C%D8%B7%20%D9%87%D8%A7%DB%8C%20%D8%A7%D8%B3%D8%AA%D8%AE%D8%B1%DB%8C%20%D8%8C%20%D8%AC%DA%A9%D9%88%D8%B2%DB%8C%20%D9%88%20%D8%B3%D9%88%D9%86%D8%A7%DB%8C%20%D8%A8%D8%AE%D8%A7%D8%B1/category/QzZWTEprbTJ1THM9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%206%20%D9%BE%D9%84%D9%87%20%D9%88%20%D8%B2%DB%8C%D8%B1%D9%BE%D9%84%D9%87%20(%D8%AF%D8%A7%D8%AE%D9%84%20%D9%88%20%D8%A8%DB%8C%D8%B1%D9%88%D9%86%20%D8%B3%D8%A7%D8%AE%D8%AA%D9%85%D8%A7%D9%86%20)/category/cS83WVBZaDluV1k9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%205%20%DA%A9%D9%81%20%D8%B3%D8%A7%D9%84%D9%86%20%20%D9%88%20%D8%A7%D8%AA%D8%A7%D9%82%20%D9%87%D8%A7%20(%20%DA%A9%D9%84%DA%A9%D8%B3%DB%8C%D9%88%D9%86%20%D8%B3%D9%86%DA%AF%20%D9%88%20%D8%B3%D8%A7%DB%8C%D8%B1%20)/category/TjYrM2Z2YkF0cjA9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%204%20%DA%A9%D9%81%20%D8%B3%D8%A7%D9%84%D9%86%20%20%D9%88%20%D8%A7%D8%AA%D8%A7%D9%82%20%D9%87%D8%A7%20(%20%DA%A9%D9%84%DA%A9%D8%B3%DB%8C%D9%88%D9%86%20%DA%86%D9%88%D8%A8%20)/category/RlpvUGRBSkpRbzA9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%208%20%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%20%D8%B1%D8%A7%D9%87%20%D9%BE%D9%84%D9%87%20%D8%8C%20%D8%AF%D9%88%D8%B1%20%D8%A2%D8%B3%D8%A7%D9%86%D8%B3%D9%88%D8%B1%20%D8%8C%20%D9%86%D9%85%D8%A7%DB%8C%20%D8%B3%D8%A7%D8%AE%D8%AA%D9%85%D8%A7%D9%86%D8%8C%20%D9%86%D9%85%D8%A7%DB%8C%20%D8%AD%DB%8C%D8%A7%D8%B7%20%D9%88%D9%86%D9%85%D8%A7%DB%8C%20%D9%BE%D8%A7%D8%B3%DB%8C%D9%88/category/bXMzSEJaRHhKNU09/product-list.html',
                    'https://www.eefaceram.com/category/UVdaUmhtbHk4YzA9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF-3-%D8%B3%D8%AA-%D8%A2%D8%B4%D9%BE%D8%B2%D8%AE%D8%A7%D9%86%D9%87/category/YnYxcnl5Q0hTM1k9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%202%20%D8%B3%D8%B1%D9%88%DB%8C%D8%B3%20%D8%A8%D9%87%D8%AF%D8%A7%D8%B4%D8%AA%DB%8C%20%20%D9%88%20%D8%AD%D9%85%D8%A7%D9%85/category/ejlIeG9VVkRhd2c9/product-list.html',
                    'https://www.eefaceram.com/%DA%A9%D8%AF%2010%20%DA%A9%D9%81%20%D8%AD%DB%8C%D8%A7%D8%B7%D8%8C%20%D9%85%D8%AD%D9%88%D8%B7%D9%87%D8%8C%20%D9%BE%D8%A7%D8%B3%DB%8C%D9%88%20%D8%8C%20%D9%BE%DB%8C%D8%A7%D8%AF%D9%87%20%D8%B1%D9%88%20%D9%88%20%D8%A8%D8%A7%D8%BA%D8%A7%D8%AA/category/emFqbVpod3U1SGM9/product-list.html',
                ]

                // insert prooduct links to unvisited
                for (let j = 0; j < productsUrls.length; j++) {
                    try {
                        const url = productsUrls[j];
                        await insertUrl(url);
                        await delay(250);
                    } catch (error) {
                        console.log("Error in findAllProductsLinks for loop:", error.message);
                    }
                }


                nextPageBtn = await page.$$('notFound')
                if (nextPageBtn.length) {
                    let btn = nextPageBtn[0];
                    await btn.click();
                }
                await delay(3000);
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
        const INITIAL_PAGE_URL = ['https://www.eefaceram.com/']

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
            // const AllPagesLinks = await findAllPagesLinks(page, mainLinks);
            await findAllProductsLinks(page, mainLinks);
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
