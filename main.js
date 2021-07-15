/**
 * This template is a production ready boilerplate for developing with `CheerioCrawler`.
 * Use this to bootstrap your projects using the most up-to-date code.
 * If you're looking for examples or want to learn more, see README.
 */

const Apify = require('apify');
const _ = require('lodash');
const { handleDetail } = require('./src/routes');

const { utils: { log } } = Apify;

Apify.main(async () => {
    const baseUrl = 'https://www.lehrplanplus.bayern.de/fachlehrplan/gymnasium';
    const { subjects } = await Apify.getInput();

    const requestList = await Apify.openRequestList(
        'urls',
        _.flatMap(
            subjects,
            (subject) => _.map(subject.years, (year) => ({
                url: `${baseUrl}/${year}/${subject.label}`,
            })),
        ),
    );
    const requestQueue = await Apify.openRequestQueue();
    // const proxyConfiguration = await Apify.createProxyConfiguration();

    const crawler = new Apify.CheerioCrawler({
        requestList,
        requestQueue,
        // proxyConfiguration,
        // Be nice to the websites.
        // Remove to unleash full power.
        maxConcurrency: 50,
        handlePageFunction: async (context) => {
            const { url } = context.request;
            log.info('Page opened.', { url });
            return handleDetail(context);
        },
    });

    log.info('Starting the crawl.');
    await crawler.run();
    log.info('Crawl finished.');
});
