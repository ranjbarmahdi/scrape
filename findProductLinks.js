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
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%BE%D9%84%D9%87/%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%BE%D9%84%D9%87-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%86%D8%B1%D8%AF%D9%87-%D8%A8%D8%A7%D8%BA%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%BE%D9%84%D9%87-%D8%AA%D9%85%D8%A7%D9%85-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%86%D8%B1%D8%AF%D9%87/%D8%B4%DB%8C%D8%B4%D9%87-%D8%A7%DB%8C/%D9%86%D8%B1%D8%AF%D9%87-%D8%B4%DB%8C%D8%B4%D9%87-%D8%A7%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D8%A7%D9%84%D9%88%D9%85%DB%8C%D9%86%DB%8C%D9%88%D9%85",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%86%D8%B1%D8%AF%D9%87/%D9%86%D8%B1%D8%AF%D9%87-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%86%D8%B1%D8%AF%D9%87-%D8%B3%D9%87-%D8%AE%D8%B7",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%86%D8%B1%D8%AF%D9%87-%D9%87%D9%84%D8%A7%D9%84%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%DA%A9%D9%86%D8%B3%D9%88%D9%84/%DA%A9%D9%86%D8%B3%D9%88%D9%84-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D9%85%D9%86%D8%B2%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B1%DA%AF%D8%A7%D9%84/%D8%B1%DA%AF%D8%A7%D9%84-%D9%84%D8%A8%D8%A7%D8%B3/%D8%B1%DA%AF%D8%A7%D9%84-%D9%84%D8%A8%D8%A7%D8%B3-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%BE%D9%84%D9%87/%D9%85%D8%AF%D9%88%D9%84%D8%A7%D8%B1/%DA%A9%D9%BE%D8%B3%D9%88%D9%84%DB%8C-%D8%A7%D9%87%D9%86%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%BE%D9%84%D9%87/%D8%AA%DA%A9-%D9%85%D8%AD%D9%88%D8%B1/%D9%BE%D9%84%D9%87-%D8%AA%DA%A9-%D9%85%D8%AD%D9%88%D8%B1",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64s106d",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%85%DB%8C%D8%B2-%D9%BE%D8%B0%DB%8C%D8%B1%D8%A7%DB%8C%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B2%D9%87/%D8%B5%D9%86%D8%B9%D8%AA%DB%8C/%D8%B3%D8%A7%D8%B2%D9%87-%D8%B5%D9%86%D8%B9%D8%AA%DB%8C-%D8%A7%D8%B1%DA%AF%D9%88%D9%86-%D8%B5%D9%86%D8%A7%DB%8C%D8%B9-%D8%BA%D8%B0%D8%A7%DB%8C%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2-%DA%A9%D9%86%D8%A7%D8%B1-%D9%85%D8%A8%D9%84%DB%8C/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C/%D9%85%DB%8C%D8%B2-%DA%A9%D9%86%D8%A7%D8%B1-%D9%85%D8%A8%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64m103",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%86%D8%B1%D8%AF%D9%87-%D8%A7%D9%84%D9%88%D9%85%DB%8C%D9%86%DB%8C%D9%88%D9%85",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D9%BE%D8%B0%DB%8C%D8%B1%D8%A7%DB%8C%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%86%D8%B1%D8%AF%D9%87-%D8%AA%D8%B1%DA%A9%DB%8C%D8%A8%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%BE%D9%84%D9%87/%D9%88%D8%B1%D9%82%DB%8C/%D9%BE%D9%84%D9%87-%D8%AF%D9%88%D8%B7%D8%B1%D9%81-%D9%88%D8%B1%D9%82",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%A7%D8%B3%D9%BE%D8%A7%DB%8C%D8%AF%D8%B1/%D9%86%D9%85%D8%A7/%D9%86%D9%85%D8%A7%DB%8C-%D8%A7%D8%B3%D9%BE%D8%A7%DB%8C%D8%AF%D8%B1",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%A7%D8%B3%D8%AA%D9%86%D8%AF/%D8%A7%D8%B3%D8%AA%D9%86%D8%AF-%D8%A7%DB%8C%D8%AA%DB%8C%D9%84/r64s101gold",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%88%DB%8C%D8%AA%D8%B1%DB%8C%D9%86/%D9%88%DB%8C%D8%AA%D8%B1%DB%8C%D9%86-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64v101",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D9%BE%D8%B0%DB%8C%D8%B1%D8%A7%DB%8C%DB%8C",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D9%88%D8%B3%D8%B7/%D9%85%DB%8C%D8%B2-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64d102",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%85%DB%8C%D8%B2-%D8%A8%D8%A7%D8%B1/%D9%85%DB%8C%D8%B2-%D9%86%D9%88%D8%B4%DB%8C%D8%AF%D9%86%DB%8C-%D9%85%DB%8C%D8%B2-%D8%A8%D8%A7%D8%B1",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D9%85%D8%B3%D8%AA%D8%B7%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64d1022",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%A8%D8%A7%D8%B1/3r64m103",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s103",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%A8%D8%A7%D8%B1/%D9%85%DB%8C%D8%B2-%D8%A8%D8%A7%D8%B1-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s104",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84-%D8%AF%DA%A9%D9%88%D8%B1%DB%8C/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D9%BE%D8%B0%DB%8C%D8%B1%D8%A7%DB%8C%DB%8C-%D9%85%D9%86%D8%B2%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s102-60gold",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%DB%8C%D9%86%DB%8C/%D8%B3%DB%8C%D9%86%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/%D9%84%D9%88%D8%A7%D8%B2%D9%85-%D9%BE%D8%B0%DB%8C%D8%B1%D8%A7%DB%8C%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s105",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s106",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA/%D8%B3%D8%A7%D8%B9%D8%AA-%D8%AF%DB%8C%D9%88%D8%A7%D8%B1%DB%8C/r64s107",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64m105",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%A7%D8%AF%D8%A7%D8%B1%DB%8C/r64me101",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%DA%A9%D9%86%D8%B3%D9%88%D9%84/%DA%A9%D9%86%D8%B3%D9%88%D9%84-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64k102",
                    "https://pssteel.ir/fa/%D9%85%D8%AD%D8%B5%D9%88%D9%84%D8%A7%D8%AA/%D9%85%DB%8C%D8%B2/%D9%85%DB%8C%D8%B2-%D8%B9%D8%B3%D9%84%DB%8C-%D8%A7%D8%B3%D8%AA%DB%8C%D9%84/r64m1055"
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
        const INITIAL_PAGE_URL = ['https://pssteel.ir/']

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
