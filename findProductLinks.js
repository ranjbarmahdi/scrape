const cheerio = require("cheerio");
const { getBrowser, getRandomElement, shuffleArray, delay } = require("./utils");
const db = require("./config.js");

// ============================================ insertUrl
async function insertUrl(url) {
    const existsQuery = `
        SELECT * FROM unvisited u 
        where "url"=$1
    `;

    const insertQuery = `
        INSERT INTO unvisited ("url")
        VALUES ($1)
        RETURNING *;
    `;
    const urlInDb = await db.oneOrNone(existsQuery, [url]);
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
        const mainLinks = $("notFound")
            .map((i, a) => $(a).attr("href")?.trim())
            .get();

        // Push This Page Products Urls To allProductsLinks
        allMainLinks.push(initialUrl);
    } catch (error) {
        console.log("Error In findAllMainLinks function", error.message);
    }

    return Array.from(new Set(allMainLinks));
}

// ============================================ findAllPagesLinks
async function findAllPagesLinks(page, mainLinks) {
    let allPagesLinks = [];

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
            const paginationElement = $("notFound");
            console.log("Pagination Element : ", paginationElement.length);
            if (paginationElement.length) {
                let lsatPageNumber = $("notFound")?.last().text()?.trim();
                console.log("Last Page Number : ", lsatPageNumber);
                lsatPageNumber = Number(lsatPageNumber);
                for (let j = 1; j <= lsatPageNumber; j++) {
                    const newUrl = url + `?page=${j}`;
                    allPagesLinks.push(newUrl);
                }
            } else {
                allPagesLinks.push(url);
            }
        } catch (error) {
            console.log("Error in findAllPagesLinks", error);
        }
    }

    allPagesLinks = shuffleArray(allPagesLinks);
    return Array.from(new Set(allPagesLinks));
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
                    "https://aryatisgroup.com/product/electric-water-heater-asx15/",
                    "https://aryatisgroup.com/product/electric-water-heater-asx-30/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhc-6-x/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-acv-250/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-acv-350/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-acv-500/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-arv-b150/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-avw14/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-avw27/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-avw32/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d1-5/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d10/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d13/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d15/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d2-5/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d20/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d26/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d3-5/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d5/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d6-5/",
                    "https://aryatisgroup.com/product/ventilation-aryatis-ahbv-d8/",
                    "https://aryatisgroup.com/product/fan-coil-aryatis-apf2-34/",
                    "https://aryatisgroup.com/product/fancoil-aryatis-apf2-51/",
                    "https://aryatisgroup.com/product/water-filter-vitac/",
                    "https://aryatisgroup.com/product/electric-water-heater-asg-80litr-aryatis/",
                    "https://aryatisgroup.com/product/electric-water-heater-asg-100litr-aryatis/",
                    "https://aryatisgroup.com/product/electric-water-heater-asg-50litr-aryatis/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-ij-e/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhb-e-18/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhd-6-ec/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-pey/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-atd-21/",
                    "https://aryatisgroup.com/product/electrical-water-heater-atd21ca/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-afd-8-ca/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-afs-8/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-aks-6/",
                    "https://aryatisgroup.com/product/electrical-water-heater-asl-8-ca/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-atd-11-ca/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-akd-6-ca/",
                    "https://aryatisgroup.com/product/electrical-water-heater-ast-6-ca/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-dsf-7-u/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhc-6-ec/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhc-8-ec/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhb-e-11/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhc-8-xg/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhc-e-8/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dnm3/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-4-dnm/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-6-dnm/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-per/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-is-60-e/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%d9%8a%d9%88%d8%a7%d8%b1%db%8c-%d9%85%d8%af%d9%84-d30-15a/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%d9%8a%d9%88%d8%a7%d8%b1%db%8c-%d9%85%d8%af%d9%84-d50-15-a/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-15-%d9%84%db%8c%d8%aa%d8%b1%db%8c-%d9%85%d8%af%d9%84-d15-15vb/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-30-%d9%84%db%8c%d8%aa%d8%b1%db%8c-%d9%85%d8%af%d9%84-d30-15vb/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-%d9%85%d8%af%d9%84d30-50-ed/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-%d9%85%d8%af%d9%84-evb/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-%d9%85%d8%af%d9%84-w/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-30-%d9%84%db%8c%d8%aa%d8%b1%db%8c-%d9%85%d8%af%d9%84d50-20-ed/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-30-%d9%84%db%8c%d8%aa%d8%b1%db%8c-%d9%85%d8%af%d9%84d80-20-ed/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%af%db%8c%d9%88%d8%a7%d8%b1%db%8c-80%d9%84%db%8c%d8%aa%d8%b1%db%8c-%d9%85%d8%af%d9%84d80-20-w/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-shc/",
                    "https://aryatisgroup.com/product/%d8%a8%d8%ae%d8%a7%d8%b1%db%8c-%d8%a8%d8%b1%d9%82%db%8c-%d9%81%d9%86-%d8%af%d8%a7%d8%b1-cbs-20-s/",
                    "https://aryatisgroup.com/product/%d8%a8%d8%ae%d8%a7%d8%b1%db%8c-%d8%a8%d8%b1%d9%82%db%8c-%d9%81%d9%86-%d8%af%d8%a7%d8%b1-ck-20-s/",
                    "https://aryatisgroup.com/product/%d8%a8%d8%ae%d8%a7%d8%b1%db%8c-%d8%a8%d8%b1%d9%82%db%8c-%d9%81%d9%86-%d8%af%d8%a7%d8%b1-ck20-trend/",
                    "https://aryatisgroup.com/product/%d9%87%db%8c%d8%aa%d8%b1-%d8%aa%d8%a7%d8%a8%d8%b4%db%8c-%d9%85%d8%a7%d8%af%d9%88%d9%86-%d9%82%d8%b1%d9%85%d8%b2-ifs-2009s/",
                    "https://aryatisgroup.com/product/%d8%a8%d8%ae%d8%a7%d8%b1%db%8c-%d8%a8%d8%b1%d9%82%db%8c-%d8%aa%d8%a7%d8%a8%d8%b4%db%8c-ia-2024/",
                    "https://aryatisgroup.com/product/%d8%a8%d9%88%db%8c%d9%84%d8%b1-ebk-5/",
                    "https://aryatisgroup.com/product/%d9%be%da%a9%db%8c%d8%ac-%d8%a8%d8%b1%d9%82%db%8c-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-a12-%d8%b3%d9%87-%d9%81%d8%a7%d8%b2/",
                    "https://aryatisgroup.com/product/%d9%85%d8%b4%d8%ae%d8%b5%d8%a7%d8%aa-%d9%be%da%a9%db%8c%d8%ac-%d8%a8%d8%b1%d9%82%db%8c-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-adb21ca-%d8%b3%d9%87-%d9%81%d8%a7%d8%b2/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b1%d9%85%d9%88%d8%b3%d8%aa%d8%a7%d8%aa-%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-rtu-s-up/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-af10-ukc/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-af15-cnw/",
                    "https://aryatisgroup.com/product/towel-warmer-afb1001/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-afi-cnw/",
                    "https://aryatisgroup.com/product/towel-warmer-afs1001/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-afy-nog/",
                    "https://aryatisgroup.com/product/towel-warmer-ahb5008/",
                    "https://aryatisgroup.com/product/towel-warmer-ahb701/",
                    "https://aryatisgroup.com/product/towel-warmer-ahw701/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-alps-cnw/",
                    "https://aryatisgroup.com/product/towel-warmer-aug3002/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-rt-uc/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-bhe/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhe-18-s/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-hte-4/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d9%87%d9%88%d8%a7%db%8c-%da%af%d8%b1%d9%85-%d8%b3%d8%b1%db%8c-htt-4-ws/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d9%87%d9%88%d8%a7%db%8c-%da%af%d8%b1%d9%85-%d8%b3%d8%b1%db%8c-htt-5-am/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%b3%d8%b1%db%8c-5-htt/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d9%87%d9%88%d8%a7%db%8c-%da%af%d8%b1%d9%85-%d8%b3%d8%b1%db%8c-htt-5-ws/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%b3%d8%b1%d8%b9%d8%aa-%d8%a8%d8%a7%d9%84%d8%a7-ultronic-s/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%b3%d8%b1%db%8c-ultronic/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b5%d9%81%db%8c%d9%87-%d8%a2%d8%a8-nature/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b5%d9%81%db%8c%d9%87-%d8%a2%d8%a8-%d8%b1%d9%88%d9%85%db%8c%d8%b2%db%8c-fountain/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b5%d9%81%db%8c%d9%87-%d8%a2%d8%a8-%d8%b1%d9%88%d9%85%db%8c%d8%b2%db%8c-rain-plus/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftt-640/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftm-1050/",
                    "https://aryatisgroup.com/product/%d8%b3%db%8c%d8%b3%d8%aa%d9%85-%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftm-150/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftm-300/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftt-1120/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftt-160/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%d8%a8%d8%b1%d9%82%db%8c-%da%a9%d9%81-ftt-320/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftt-400/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftt-960/",
                    "https://aryatisgroup.com/product/%d8%a8%d8%ae%d8%a7%d8%b1%db%8c-%d8%a8%d8%b1%d9%82%db%8c-%da%a9%d9%86%d9%88%da%a9%d8%aa%d9%88%d8%b1-cnd-200/",
                    "https://aryatisgroup.com/product/%d8%b4%d9%88%d9%81%d8%a7%da%98-%d8%a8%d8%b1%d9%82%db%8c-cnl/",
                    "https://aryatisgroup.com/product/%d8%b4%d9%88%d9%81%d8%a7%da%98-%d8%a8%d8%b1%d9%82%db%8c-cnr/",
                    "https://aryatisgroup.com/product/coolbox-aryatis-ag15/",
                    "https://aryatisgroup.com/product/coolbox-aryatis-ag8/",
                    "https://aryatisgroup.com/product/%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-%d8%a8%d8%b1%d9%82%db%8c-ftm-225/",
                    "https://aryatisgroup.com/product/%d9%87%db%8c%d8%aa-%d9%be%d9%85%d9%be-%d8%a2%d8%a8-%da%af%d8%b1%d9%85-wwk-300-electronic/",
                    "https://aryatisgroup.com/product/%d9%87%db%8c%d8%aa-%d9%be%d9%85%d9%be-%d8%a2%d8%a8-%d8%a7%d8%b3%d8%aa%d8%ae%d8%b1-as15-025/",
                    "https://aryatisgroup.com/product/heatpump-swiming-pool-as15-045/",
                    "https://aryatisgroup.com/product/%d9%87%db%8c%d8%aa-%d9%be%d9%85%d9%be-%d8%a2%d8%a8-%d8%a7%d8%b3%d8%aa%d8%ae%d8%b1-as15-020/",
                    "https://aryatisgroup.com/product/heatpump-swiming-pool-as15-030/",
                    "https://aryatisgroup.com/product/%d9%87%db%8c%d8%aa%d8%b1-%d8%aa%d8%a7%d8%a8%d8%b4%db%8c-%d9%85%d8%a7%d8%af%d9%88%d9%86-%d9%82%d8%b1%d9%85%d8%b2-ifr-2008r/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifra-010k/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifra-020k/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifra-030k/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifra3-300/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifrc-150/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifrh011-200/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifrh-i500s/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifri6003ga/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifri6003ga-1/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-del-18-s/",
                    "https://aryatisgroup.com/product/car-fridge-freezer-aryatis-arb35/",
                    "https://aryatisgroup.com/product/fridge-freezer-arf36-aryatis/",
                    "https://aryatisgroup.com/product/fridge-freezer-aef50-aryatis/",
                    "https://aryatisgroup.com/product/car-fridge-freezer-aryatis-arb55/",
                    "https://aryatisgroup.com/product/car-fridge-freezer-aryatis-arf60/",
                    "https://aryatisgroup.com/product/car-fridge-freezer-aryatis-arb75/",
                    "https://aryatisgroup.com/product/car-fridge-freezer-aryatis-arb95/",
                    "https://aryatisgroup.com/product/heat-pump-water-heaters-ac15-008p/",
                    "https://aryatisgroup.com/product/heat-pump-water-heaters-ac15-012p/",
                    "https://aryatisgroup.com/product/heat-pump-water-heaters-ac15-017p/",
                    "https://aryatisgroup.com/product/heat-pump-water-heaters-ac15-020p/",
                    "https://aryatisgroup.com/product/heat-pump-water-heaters-ac15-030s/",
                    "https://aryatisgroup.com/product/pool-heat-pump-as15-065/",
                    "https://aryatisgroup.com/product/pool-heat-pump-as35-045t/",
                    "https://aryatisgroup.com/product/pool-heat-pump-as35-065-2/",
                    "https://aryatisgroup.com/product/heating-and-cooling-packaged-alb1-07/",
                    "https://aryatisgroup.com/product/heating-and-cooling-packaged-alb1-100/",
                    "https://aryatisgroup.com/product/heating-and-cooling-packaged-alb2-130/",
                    "https://aryatisgroup.com/product/heating-and-cooling-packaged-alb2-180/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-phb-13/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b1%d9%86-dhm/",
                    "https://aryatisgroup.com/product/electric-water-heater-asg-aryatis/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86ddh6/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%a7%d8%b3%d8%aa%db%8c%d8%a8%d9%84-%d8%a7%d9%84%d8%aa%d8%b1%d9%88%d9%86-dhf-12-c/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a8%d8%af%d9%88%d9%86-%d9%85%d8%ae%d8%b2%d9%86-hdb-e-si/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-psh-si/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-psh-trend/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-psh-universal/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-shu/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-shz-lcd/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-%d8%a7%db%8c%d8%b3%d8%aa%d8%a7%d8%af%d9%87-sb-ac/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-%d8%a7%db%8c%d8%b3%d8%aa%d8%a7%d8%af%d9%87-sb-s/",
                    "https://aryatisgroup.com/product/%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d9%85%d8%ae%d8%b2%d9%86-%d8%af%d8%a7%d8%b1-%d8%a7%db%8c%d8%b3%d8%aa%d8%a7%d8%af%d9%87-sho-ac/",
                    "https://aryatisgroup.com/product/%d8%a7%d8%aa%d8%b5%d8%a7%d9%84%d8%a7%d8%aa-%d9%be%d9%86%d9%84-%d9%87%d8%a7%db%8c-%d8%ae%d9%88%d8%b1%d8%b4%d9%8a%d8%af%db%8c-sol-sv-a50/",
                    "https://aryatisgroup.com/product/%d8%a7%d8%aa%d8%b5%d8%a7%d9%84%d8%a7%d8%aa-%d9%be%d9%86%d9%84-%d9%87%d8%a7%d9%8a-%d8%ae%d9%88%d8%b1%d8%b4%d9%8a%d8%af%db%8c-sol-sv-f/",
                    "https://aryatisgroup.com/product/%d8%a8%d9%88%db%8c%d9%84%d8%b1-snu-hothot/",
                    "https://aryatisgroup.com/product/%d9%be%d9%86%d9%84-%d8%ae%d9%88%d8%b1%d8%b4%db%8c%d8%af%db%8c-sol-27-basic/",
                    "https://aryatisgroup.com/product/%d9%be%d9%86%d9%84-%d8%ae%d9%88%d8%b1%d8%b4%db%8c%d8%af%db%8c-sol-27-premium-s/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b1%d9%85%d9%88%d8%b3%d8%aa%d8%a7%d8%aa-%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-rtf/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b1%d9%85%d9%88%d8%b3%d8%aa%d8%a7%d8%aa-%da%af%d8%b1%d9%85%d8%a7%db%8c%d8%b4-%d8%a7%d8%b2-%da%a9%d9%81-rtz-s-up/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-%d8%a2%d8%b1%db%8c%d8%a7%d8%aa%db%8c%d8%b3-af01-cnw/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-af01-p16w/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-af01-uc12/",
                    "https://aryatisgroup.com/product/%d8%ad%d9%88%d9%84%d9%87-%d8%ae%d8%b4%da%a9-%da%a9%d9%86-%d8%a8%d8%b1%d9%82%db%8c-rt-cn/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b5%d9%81%db%8c%d9%87-%d8%a2%d8%a8-%d8%b2%db%8c%d8%b1-%d8%b3%db%8c%d9%86%da%a9%db%8c-stream/",
                    "https://aryatisgroup.com/product/%d8%aa%d8%b5%d9%81%db%8c%d9%87-%d8%a2%d8%a8-%d8%b1%d9%88%d9%85%db%8c%d8%b2%db%8c-fountain-s7/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa%da%af%d8%a7%d9%87-%d8%aa%d9%87%d9%88%db%8c%d9%87-%d9%87%d9%88%d8%a7%db%8c-%d8%ba%db%8c%d8%b1-%d9%85%d8%b1%da%a9%d8%b2%db%8c-lwe-40-ve/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa%da%af%d8%a7%d9%87-%d8%aa%d9%87%d9%88%db%8c%d9%87-%d9%87%d9%88%d8%a7%db%8c-%d8%ba%db%8c%d8%b1-%d9%85%d8%b1%da%a9%d8%b2%db%8c-lwe-40/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa%da%af%d8%a7%d9%87-%d8%aa%d9%87%d9%88%db%8c%d9%87-%d9%87%d9%88%d8%a7%db%8c-%d9%85%d8%b1%da%a9%d8%b2%db%8c-lwz-280/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa%da%af%d8%a7%d9%87-%d8%aa%d9%87%d9%88%db%8c%d9%87-%d9%87%d9%88%d8%a7%db%8c-%d9%85%d8%b1%da%a9%d8%b2%db%8c-lwz-370-plus/",
                    "https://aryatisgroup.com/product/%d8%af%d8%b3%d8%aa%da%af%d8%a7%d9%87-%d8%aa%d9%87%d9%88%db%8c%d9%87-%d9%87%d9%88%d8%a7%db%8c-%d9%85%d8%b1%da%a9%d8%b2%db%8c-lwz-70-e/",
                    "https://aryatisgroup.com/product/%d8%b3%d8%aa-%d8%a2%d8%a8%da%af%d8%b1%d9%85%da%a9%d9%86-%d8%ae%d9%88%d8%b1%d8%b4%db%8c%d8%af%db%8c-sbs-601-w-sol/",
                    "https://aryatisgroup.com/product/%d8%b3%d9%86%da%af-%d9%87%d8%a7%db%8c-%d8%ad%d8%b1%d8%a7%d8%b1%d8%aa%db%8c-mhg-e/",
                    "https://aryatisgroup.com/product/%d8%b3%d9%86%da%af-%d9%87%d8%a7%db%8c-%d8%ad%d8%b1%d8%a7%d8%b1%d8%aa%db%8c-mhj-e/",
                    "https://aryatisgroup.com/product/%d8%b3%d9%86%da%af-%d9%87%d8%a7%db%8c-%d8%ad%d8%b1%d8%a7%d8%b1%d8%aa%db%8c-sph-e/",
                    "https://aryatisgroup.com/product/electric-radiant-heater-ifrh-i250b/",
                ];

                // $(".products > li > div > a:first-child")
                // .map((i, e) => $(e).attr("href"))
                // .get();

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

                nextPageBtn = await page.$$("notFound");
                if (nextPageBtn.length) {
                    let btn = nextPageBtn[0];
                    await btn.click();
                }
                await delay(3000);
            } while (nextPageBtn.length);
        } catch (error) {
            console.log("Error In findAllProductsLinks function", error);
        }
    }
}

// ============================================ Main
async function main() {
    try {
        const INITIAL_PAGE_URL = ["https://aryatisgroup.com/"];

        // get random proxy
        const proxyList = [""];
        const randomProxy = getRandomElement(proxyList);

        // Lunch Browser
        const browser = await getBrowser(randomProxy, true, false);
        const page = await browser.newPage();
        await page.setViewport({
            width: 1920,
            height: 1080,
        });

        for (const u of INITIAL_PAGE_URL) {
            const mainLinks = await findAllMainLinks(page, u);
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
