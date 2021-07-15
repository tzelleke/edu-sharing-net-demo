const Apify = require('apify');
const _ = require('lodash');

const { utils: { log } } = Apify;

const verboseRegExp = (input) => {
    if (input.raw.length !== 1) {
        throw Error('verboseRegExp: interpolation is not supported');
    }

    const source = input.raw[0];
    const regexp = /(?<!\\)\s|[/][/].*|[/][*][\s\S]*[*][/]/g;
    const result = source.replace(regexp, '');

    return new RegExp(result);
};

const NBSP_PATTERN = RegExp(String.fromCharCode(160), 'g');

exports.handleDetail = async ({
    request,
    $,
}) => {
    const handleTopicHeading = (i, e) => {
        const id = $(':first-child', e)
            .attr('id');

        const {
            subject,
            year,
            section,
        } = $('.head-absatz-num', e)
            .text()
            .trim()
            .replace(NBSP_PATTERN, ' ')
            .match(verboseRegExp`
                ^
                (?<subject>[^\d]+)
                (?<year>\d+)
                \s+
                (?<section>.*)
                $
            `)
            .groups;

        const {
            text,
            estimate,
        } = $('.head-absatz-title-short, .head-absatz-title-long', e)
            .text()
            .trim()
            .replace(NBSP_PATTERN, ' ')
            .match(verboseRegExp`
                ^
                (?<text>.*?)
                \s*
                (
                  \(ca\.
                  \s+
                  (?<estimate>\d+)
                  \s+Std\.\)
                )?
                $
            `)
            .groups;

        return {
            id,
            subject,
            year: parseInt(year, 10),
            section,
            text,
            estimate: estimate ? parseInt(estimate, 10) : null,
        };
    };

    const handleTopicContent = (i, e) => {
        const heading = $('h6:first-child', e)
            .text()
            .trim()
            .replace(NBSP_PATTERN, ' ');

        const text = $('h6:first-child', e)
            .nextUntil('ul')
            .text()
            .trim()
            .replace(NBSP_PATTERN, ' ');

        const items = $('ul > li', e)
            .map((ii, ee) => ({
                text: $(ee)
                    .text()
                    .trim()
                    .replace(NBSP_PATTERN, ' '),
                competencies: _.defaultTo(
                    $('img.lk-kompetenzen', ee)
                        .attr('data-title'),
                    '',
                )
                    .trim()
                    .replace(NBSP_PATTERN, ' '),
            }))
            .toArray();

        return {
            heading,
            text,
            items,
        };
    };

    const handleTopic = (i, e) => {
        const level = $('h4', e).length ? 2 : 1;
        const heading = handleTopicHeading(i, e);
        const content = $('.thema_absch', e)
            .map(handleTopicContent)
            .toArray();

        return {
            level,
            heading,
            content,
        };
    };

    const data = $('#fachlehrplan')
        .children('[id^="thema_"]')
        .map(handleTopic)
        .toArray();

    const {
        subject,
        year,
    } = request.url.match(verboseRegExp`
        (?<year>[^/]+)
        \/
        (?<subject>[^/]+)
        $
    `).groups;

    const store = await Apify.openKeyValueStore('data');
    await store.setValue(`${subject}-${year}`, { data });
};
