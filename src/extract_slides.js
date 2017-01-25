// Copyright 2016 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const debug = require('debug')('md2gslides');
const markdownIt = require('markdown-it');
const attrs = require('markdown-it-attrs');
const lazyHeaders = require('markdown-it-lazy-headers');
const emoji = require('markdown-it-emoji');
const expandTabs = require('markdown-it-expand-tabs');
const video = require('markdown-it-video');
const uuid = require('uuid');
const extend = require('extend');
const nativeCSS = require('native-css');
const low = require('lowlight');
const parseColor = require('parse-color');
const parse5 = require('parse5');
const inlineStylesParse = require('inline-styles-parse');
const markdownTokenRules = {};
const htmlTokenRules = {};

const NO_OP = function() {};

/**
 * Parse the markdown and converts it into a form more suitable
 * for creating slides.
 *
 * Returns an array of objects where each item represents an individual
 * slide.
 *
 * @param {string} markdown
 * @param {string} stylesheet
 * @returns {Promise.<Array>}
 */
function extractSlides(markdown, stylesheet) {
    let tokens = parseMarkdown(markdown);
    let css = nativeCSS.convert(stylesheet);
    let env = {
        slides: [],
        currentSlide: null,
        styles: [{
            bold: undefined,
            italic: undefined,
            fontFamily: undefined,
            foregroundColor: undefined,
            link: undefined,
            backgroundColor: undefined,
            underline: undefined,
            strikethrough: undefined,
            smallCaps: undefined,
            baselineOffset: undefined
        }],
        listDepth: 0,
        css: css,
        inlineHtmlContext: undefined
    };

    startSlide(env);

    for(let index in tokens) {
        let token = tokens[index];
        if (token.type == 'hr' && index == 0) {
            continue; // Skip leading HR since no previous slide
        }
        processMarkdownToken(token, env);
    }
    endSlide(env);
    debug(JSON.stringify(env.slides, null, 2));
    return env.slides;
}

function parseMarkdown(markdown) {
    const mdOptions = {
        html: true,
        langPrefix: 'highlight ',
        linkify: false,
        breaks: false
    };
    const parser = markdownIt(mdOptions)
        .use(attrs)
        .use(lazyHeaders)
        .use(emoji, {shortcuts: {}})
        .use(expandTabs, {tabWidth: 4})
        .use(video, { youtube: { width: 640, height: 390 }});
    return parser.parse(markdown);
}

function processMarkdownToken(token, env) {
    let rule = markdownTokenRules[token.type];
    if (rule) {
        rule(token, env);
    } else {
        debug(`Ignoring token ${token.type}`);
    }
}

function startTextBlock(env) {
    env.text = {
        rawText: '',
        textRuns: [],
        listMarkers: []
    };
}

function endSlide(env) {
    if(env.currentSlide) {
        if (env.text && env.text.rawText.length) {
            env.currentSlide.bodies.push(env.text);
        }

        env.slides.push(env.currentSlide);
    }
}

function startSlide(env) {
    env.currentSlide = {
        objectId: uuid.v1(),
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [],
        tables: [],
        videos: [],
        images: []
    };
}

function currentStyle(env) {
    return env.styles[env.styles.length - 1];
}

function startStyle(newStyle, env) {
    const style = extend({}, newStyle, currentStyle(env));
    style.start = env.text.rawText.length;
    env.styles.push(style);
}

function endStyle(env) {
    const style = env.styles.pop();
    style.end = env.text.rawText.length;
    if (style.start == style.end) {
        return; // Ignore empty ranges
    }
    env.text.textRuns.push(style);
}

function attr(token, name) {
    if (token.attrs) {
        for(let attr of token.attrs) {
            if(attr[0] == name) {
                return attr[1];
            }
        }
    }
    return null;
}

function hasClass(token, cls) {
    return cls == attr(token, 'class');
}

// The following are rules for handing various markdown tokens


markdownTokenRules['heading_open'] = function(token, env) {
    startTextBlock(env);
    env.text.big = hasClass(token, 'big');
};

markdownTokenRules['heading_close'] = function(token, env) {
    if(token.tag == 'h1') {
        env.currentSlide.title = env.text;
    } else if (token.tag == 'h2') {
        env.currentSlide.subtitle = env.text;
    } else {
        debug(`Ignoring header element ${token.tag}`);
    }
    startTextBlock(env);
};

markdownTokenRules['inline'] = function(token, env) {
    for(let child of token.children) {
        processMarkdownToken(child, env);
    }
};

markdownTokenRules['html_inline'] = function(token, env) {
    const fragment = parse5.parseFragment(token.content, env.inlineHtmlContext);
    if(fragment.childNodes.length) {
        const style = {};
        env.inlineHtmlContext = fragment.childNodes[0];
        const node = fragment.childNodes[0];
        switch (node.nodeName) {
        case 'strong':
        case 'b':
            style.bold = true;
            break;
        case 'em':
        case 'i':
            style.italic = true;
            break;
        case 'code':
            style.fontFamily = 'Courier New';
            break;
        case 'sub':
            style.baselineOffset = 'SUBSCRIPT';
            break;
        case 'sup':
            style.baselineOffset = 'SUPERSCRIPT';
            break;
        case 'span':
            break;
        default:
            throw new Error('Unsupported inline HTML element: ' + node.nodeName);
        }
        for(let attr of node.attrs) {
            if (attr.name == 'style') {
                const dummyRule = inlineStylesParse.declarationsToRule(attr.value);
                const css = nativeCSS.convert(dummyRule);
                convertCssRule(css['dummy'], style);
                break;
            }
        }
        startStyle(style, env);
    } else {
        endStyle(env);
    }
};

markdownTokenRules['text'] = function(token, env) {
    env.text.rawText += token.content;
};

markdownTokenRules['hr'] = function(token, env) {
    endSlide(env);
    startSlide(env);
};

markdownTokenRules['paragraph_open'] = function(token, env) {
    if (hasClass(token, 'column')) {
        env.markerParagraph = true;
        env.currentSlide.bodies.push(env.text);
        startTextBlock(env);
    } else if (!env.text) {
        startTextBlock(env);
    }
};

markdownTokenRules['paragraph_close'] = function(token, env) {
    if (env.markerParagraph) {
        // Empty column marker, just clear flag
        env.markerParagraph = false;
    } else {
        env.text.rawText += '\n';
    }
};

markdownTokenRules['image'] = function(token, env) {
    const image = {
        url: attr(token, 'src'),
        width: undefined,
        height: undefined,
        padding: 0
    };
    const padding = attr(token, 'pad');
    if (padding) {
        image.padding = parseInt(padding);
    }
    if (hasClass(token, 'background')) {
        env.currentSlide.backgroundImage = image;
    } else {
        env.currentSlide.images.push(image);
    }
};

markdownTokenRules['video'] = function(token, env) {
    if (token.service != 'youtube') {
        throw new Error('Only YouTube videos allowed');
    }
    // Assume 16:9 aspect ratio
    const video = {
        width: 1600,
        height: 900,
        autoPlay: true,
        id: token.videoID
    };
    env.currentSlide.videos.push(video);
};

markdownTokenRules['fence'] = function(token, env) {
    if(token.info) {
        const htmlTokens = low.highlight(token.info, token.content);
        for(let token of htmlTokens.value) {
            processHtmlToken(token, env);
        }

    } else {
        // For code blocks, replace line feeds with vertical tabs to keep
        // the block as a single paragraph. This avoid the extra vertical
        // space that appears between paragraphs
        env.text.rawText += token.content.replace(/\n/g, '\u000b');
    }
    env.text.rawText += '\n';
};

markdownTokenRules['em_open'] = function(token, env) {
    startStyle({italic: true}, env);
};

markdownTokenRules['em_close'] = function(token, env) {
    endStyle(env);
};

markdownTokenRules['s_open'] = function(token, env) {
    startStyle({strikethrough: true}, env);
};

markdownTokenRules['s_close'] = function(token, env) {
    endStyle(env);
};

markdownTokenRules['strong_open'] = function(token, env) {
    startStyle({bold: true}, env);
};

markdownTokenRules['strong_close'] = function(token, env) {
    endStyle(env);
};

markdownTokenRules['link_open'] = function(token, env) {
    startStyle({
        link: {
            url: attr(token, 'href')
        }
    }, env);
};

markdownTokenRules['link_close'] = function(token, env) {
    endStyle(env);
};

markdownTokenRules['code_inline'] = function(token, env) {
    startStyle({fontFamily: 'Courier New'}, env);
    env.text.rawText += token.content;
    endStyle(env);
};

markdownTokenRules['hardbreak'] = function(token, env) {
    env.text.rawText += '\u000b';
};

markdownTokenRules['softbreak'] = function(token, env) {
    env.text.rawText += ' ';
};

markdownTokenRules['blockquote_open'] = function(token, env) {
    startStyle({italic: true}, env); // TODO - More interesting styling for block quotes
};

markdownTokenRules['blockquote_close'] = function(token, env) {
    endStyle(env);
};

markdownTokenRules['emoji'] = function(token, env) {
    env.text.rawText += token.content;
};

markdownTokenRules['table_open'] = function(token, env) {
    env.table = {
        rows: 0,
        columns: 0,
        cells: []
    };
};

markdownTokenRules['table_close'] = function(token, env) {
    env.currentSlide.tables.push(env.table);
};

markdownTokenRules['thead_open'] = NO_OP;
markdownTokenRules['thead_close'] = NO_OP;

markdownTokenRules['tbody_open'] = NO_OP;
markdownTokenRules['tbody_close'] = NO_OP;


markdownTokenRules['tr_open'] = function(token, env) {
    env.row = [];
};

markdownTokenRules['tr_close'] = function(token, env) {
    const row = env.row;
    env.table.cells.push(row);
    env.table.columns = Math.max(env.table.columns, row.length);
    env.table.rows = env.table.cells.length;
};

markdownTokenRules['td_open'] = function(token, env) {
    startStyle({
        foregroundColor: {
            opaqueColor: {
                themeColor: 'TEXT1'
            }
        }
    }, env);
    startTextBlock(env);
};

markdownTokenRules['th_open'] = function(token, env) {
    startStyle({
        bold: true,
        // Note: Non-placeholder elements aren't aware of the slide theme.
        // Set the foreground color to match the primary text color of the
        // theme.
        foregroundColor: {
            opaqueColor: {
                themeColor: 'TEXT1'
            }
        }
    }, env);
    startTextBlock(env);
};

markdownTokenRules['td_close'] = markdownTokenRules['th_close'] = function(token, env) {
    endStyle(env);
    env.row.push(env.text);
    startTextBlock(env);
};

markdownTokenRules['bullet_list_open'] = markdownTokenRules['ordered_list_open'] = function(token, env) {
    if (env.list) {
        if (env.list.tag != token.tag) {
            throw new Error('Nested lists must match parent style');
        }
        env.list.depth += 1;
    } else {
        env.list = {
            depth: 0,
            tag: token.tag,
            start: env.text.rawText.length
        };
    }
};

markdownTokenRules['bullet_list_close'] = markdownTokenRules['ordered_list_close'] = function(token, env) {
    if(env.list.depth == 0) {
        // TODO - Support nested lists with mixed styles when API supports it.
        // Currently nested lists must match the parent style.
        env.text.listMarkers.push({
            start: env.list.start,
            end: env.text.rawText.length,
            type: token.tag == 'ul' ? 'unordered' : 'ordered'
        });
        env.list = null;
    } else {
        env.list.depth -= 1;
    }
};

markdownTokenRules['list_item_open'] = function(token, env) {
    env.text.rawText += new Array(env.list.depth + 1).join('\t');
};

markdownTokenRules['list_item_close'] = NO_OP;

// These rules are specific to parsing syntax-highlighted code
// Currently these are a very small subset of HTML, limited to
// span elements.

htmlTokenRules['text'] = function(token, env) {
    // For code blocks, replace line feeds with vertical tabs to keep
    // the block as a single paragraph. This avoid the extra vertical
    // space that appears between paragraphs
    env.text.rawText += token.value.replace(/\n/g, '\u000b');
};

htmlTokenRules['span'] = function(token, env) {
    startStyle(getCssStyle(token, env), env);
    for(let child of (token.children || [])) {
        processHtmlToken(child, env);
    }
    endStyle(env);
};


function parseColorString(hexString) {
    const c = parseColor(hexString);
    if (!c.rgba) {
        return;
    }
    return {
        opaqueColor: {
            rgbColor: {
                red: c.rgba[0] / 255,
                green: c.rgba[1] / 255,
                blue: c.rgba[2] / 255
            }
        }
    };
}

function getCssStyle(token, env) {
    const classNames = token.properties['className'];
    let style = {};
    for(let cls of (classNames || [])) {
        const rule = env.css[cls.replace(/-/g, '_')];
        if (rule) {
            convertCssRule(rule, style);
        }
    }
    return style;
}

function convertCssRule(rule, style = {}) {
    if (rule['color']) {
        style.foregroundColor = parseColorString(rule['color']);
    }
    if (rule['background-color']) {
        style.backgroundColor = parseColorString(rule['background-color']);
    }    if (rule['font-weight'] == 'bold') {
        style.bold = true;
    }
    if (rule['font-style'] == 'italic') {
        style.italic = true;
    }
    if (rule['text-decoration'] == 'underline') {
        style.underline = true;
    }
    if (rule['text-decoration'] == 'line-through') {
        style.strikethrough = true;
    }
    if (rule['font-family']) {
        style.fontFamily = rule['font-family'];
    }
    if (rule['font-variant'] == 'small-caps') {
        style.smallCaps = true;
    }
    return style;
}

function processHtmlToken(token, env) {
    let rule = null;
    if(token.type == 'text') {
        rule = htmlTokenRules['text'];
    } else if (token.type == 'element') {
        rule = htmlTokenRules[token.tagName];
    }
    if (rule) {
        rule(token, env);
    }
}


module.exports = extractSlides;
