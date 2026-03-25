import puppeteer from 'puppeteer';

(async () => {
    try {
        const browser = await puppeteer.launch({ headless: "new" });
        const page = await browser.newPage();
        
        let errors = [];
        page.on('pageerror', err => {
            errors.push('PAGE ERROR: ' + err.message);
        });
        page.on('console', msg => {
            if (msg.type() === 'error') {
                errors.push('CONSOLE ERROR: ' + msg.text());
            }
        });

        console.log('Navigating to http://localhost:5173/admin/sales...');
        await page.goto('http://localhost:5173/admin/sales', { waitUntil: 'networkidle0' });
        
        if (errors.length > 0) {
            console.log('--- FOUND ERRORS ---');
            console.log(errors.join('\n'));
        } else {
            console.log('No obvious JS crashes caught. Checking page text...');
            const body = await page.evaluate(() => document.body.innerText);
            console.log(body.substring(0, 500));
        }

        await browser.close();
    } catch (e) {
        console.error('Puppeteer Script Error:', e);
    }
})();
