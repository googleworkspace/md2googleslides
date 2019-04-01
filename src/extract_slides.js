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

const _ = require('lodash');
const debug = require('debug')('md2gslides');
const markdownIt = require('markdown-it');
const attrs = require('markdown-it-attrs');
const lazyHeaders = require('markdown-it-lazy-headers');
const emoji = require('markdown-it-emoji');
const expandTabs = require('markdown-it-expand-tabs');
const video = require('markdown-it-video');
const customFence= require('markdown-it-fence');
const uuid = require('uuid');
const extend = require('extend');
const nativeCSS = require('native-css');
const low = require('lowlight');
const parseColor = require('parse-color');
const parse5 = require('parse5');
const inlineStylesParse = require('inline-styles-parse');
const inlineTokenRules = {};
const fullTokenRules = {};
const htmlTokenRules = {};

const NO_OP = function() {};

function generatedImage(md) {
    return customFence(md, 'generated_image', {
        marker: '$',
        validate: () => true
    });
}

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
    .use(generatedImage)
    .use(video, { youtube: { width: 640, height: 390 }});

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
    let env = newEnv(fullTokenRules, css);
    startSlide(env);
    processTokens(tokens, env);
    endSlide(env);
    debug(JSON.stringify(env.slides, null, 2));
    return env.slides;
}

function processTokens(tokens, env) {
    for(let index in tokens) {
        let token = tokens[index];
        if (token.type == 'hr' && index == 0) {
            continue; // Skip leading HR since no previous slide
        }
        processMarkdownToken(token, env);
    }
}

function parseMarkdown(markdown) {
    return parser.parse(markdown, {});
}

function processMarkdownToken(token, env) {
    let rule = env.rules[token.type];
    if (rule) {
        rule(token, env);
    } else {
        debug(`Ignoring token ${token.type}`);
    }
}

function newEnv(rules, css) {
    return {
        rules: rules,
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
        inlineHtmlContext: undefined,
        restrictToInline: false
    };
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
        if (env.text && env.text.rawText.trim().length) {
            env.currentSlide.bodies.push(env.text);
        }
        env.slides.push(env.currentSlide);
    }
}

function startSlide(env) {
    env.currentSlide = {
        objectId: uuid.v1(),
        customLayout: null,
        title: null,
        subtitle: null,
        backgroundImage: null,
        bodies: [],
        tables: [],
        videos: [],
        images: [],
        notes: null
    };
}

function currentStyle(env) {
    return env.styles[env.styles.length - 1];
}

function startStyle(newStyle, env) {
    const previousStyle = currentStyle(env);
    const style = extend({}, newStyle, previousStyle);
    style.start = env.text.rawText.length;
    env.styles.push(style);
}

function endStyle(env) {
    const style = env.styles.pop();
    style.end = env.text.rawText.length;
    if (style.start == style.end) {
        return; // Ignore empty ranges
    }
    if (_.isEmpty(_.keys(_.omit(style, 'start', 'end')))) {
        return; // Ignore ranges with no style
    }
    if (_.find(env.text.textRuns, _.matches(style))) {
        return; // Ignore duplicate ranges
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


// Rules for processing markdown tokens

// These rules are specific to parsing markdown in an inline context.

inlineTokenRules['heading_open'] = function(token, env) {
    const style = getStyle(token, {bold: true});
    startStyle(style, env); // TODO - Better style for inline headers
};

inlineTokenRules['heading_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['inline'] = function(token, env) {
    for(let child of token.children) {
        processMarkdownToken(child, env);
    }
};

inlineTokenRules['html_inline'] = function(token, env) {
    const fragment = parse5.parseFragment(token.content, env.inlineHtmlContext);
    if(fragment.childNodes.length) {
        env.inlineHtmlContext = fragment.childNodes[0];
        const node = fragment.childNodes[0];
        const style = getStyle(node, {});
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
        startStyle(style, env);
    } else {
        endStyle(env);
    }
};


inlineTokenRules['text'] = function(token, env) {
    const style = getStyle(token, {});
    startStyle(style, env);
    env.text.rawText += token.content;
    endStyle(env);
};

inlineTokenRules['paragraph_open'] = function(token, env) {
    if (hasClass(token, 'column')) {
        env.markerParagraph = true;
        env.currentSlide.bodies.push(env.text);
        startTextBlock(env);
    } else if (!env.text) {
        startTextBlock(env);
    }

    var layout = attr(token, 'layout');
    // If we have a layout attribute set this on the slide so we can select the 
    // right master template when building the deck
    if (layout != undefined && layout != "") {
        env.currentSlide.customLayout = layout;
    }
};

inlineTokenRules['paragraph_close'] = function(token, env) {
    if (env.markerParagraph) {
        // Empty column marker, just clear flag
        env.markerParagraph = false;
    } else {
        env.text.rawText += '\n';
    }
};


inlineTokenRules['fence'] = function(token, env) {
    const style = getStyle(token, {fontFamily: 'Courier New'});
    startStyle(style, env);
    const language = token.info ? token.info.trim() : undefined;
    if(language) {
        const htmlTokens = low.highlight(language, token.content);
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
    endStyle(env);
};

inlineTokenRules['em_open'] = function(token, env) {
    const style = getStyle(token, {italic: true});
    startStyle(style, env);
};

inlineTokenRules['em_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['s_open'] = function(token, env) {
    const style = getStyle(token, {strikethrough: true});
    startStyle(style, env);
};

inlineTokenRules['s_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['strong_open'] = function(token, env) {
    const style = getStyle(token, {bold: true});
    startStyle(style, env);
};

inlineTokenRules['strong_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['link_open'] = function(token, env) {
    const style = getStyle(token, {
        link: {
            url: attr(token, 'href')
        }
    });
    startStyle(style, env);
};

inlineTokenRules['link_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['code_inline'] = function(token, env) {
    const style = getStyle(token, {fontFamily: 'Courier New'});
    startStyle(style, env);
    env.text.rawText += token.content;
    endStyle(env);
};

inlineTokenRules['hardbreak'] = function(token, env) {
    env.text.rawText += '\u000b';
};

inlineTokenRules['softbreak'] = function(token, env) {
    env.text.rawText += ' ';
};

inlineTokenRules['blockquote_open'] = function(token, env) {
    // TODO - More interesting styling for block quotes
    const style = getStyle(token, {italic: true});
    startStyle(style, env);
};

inlineTokenRules['blockquote_close'] = function(token, env) {
    endStyle(env);
};

inlineTokenRules['emoji'] = function(token, env) {
    env.text.rawText += token.content;
};

inlineTokenRules['bullet_list_open'] = inlineTokenRules['ordered_list_open'] = function(token, env) {
    const style = getStyle(token, {});
    startStyle(style, env);
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

inlineTokenRules['bullet_list_close'] = inlineTokenRules['ordered_list_close'] = function(token, env) {
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
    endStyle(env);
};

inlineTokenRules['list_item_open'] = function(token, env) {
    const style = getStyle(token, {});
    startStyle(style, env);
    env.text.rawText += new Array(env.list.depth + 1).join('\t');
};

inlineTokenRules['list_item_close'] = function(token, env) {
    endStyle(env);
};


// Additional rules for processing the entire document
// Extends inline rules with support for additional
// tokens that only make sense in the context of a slide
// or presentation
extend(fullTokenRules, inlineTokenRules);

fullTokenRules['heading_open'] = function(token, env) {
    const style = getStyle(token, {});
    startTextBlock(env);
    startStyle(style, env);
    env.text.big = hasClass(token, 'big');
};

fullTokenRules['heading_close'] = function(token, env) {
    if(token.tag == 'h1') {
        env.currentSlide.title = env.text;
    } else if (token.tag == 'h2') {
        env.currentSlide.subtitle = env.text;
    } else {
        debug(`Ignoring header element ${token.tag}`);
    }
    endStyle(env);
    startTextBlock(env);
};

fullTokenRules['html_block'] = function(token, env) {
    var re = /<!--([\s\S]*)-->/m;
    var match = re.exec(token.content);
    if (match == null) {
        throw new Error('Unsupported HTML block: ' + token.content);
    }
    // Since the notes can contain unparsed markdown, create a new environment
    // to process it so we don't inadvertently lose state. Just carry
    // forward the notes from the current slide to append to
    var subEnv = newEnv(inlineTokenRules, env.css);
    if (env.currentSlide.notes) {
        subEnv.text = env.currentSlide.notes;
    } else {
        startTextBlock(subEnv);
    }
    var tokens = parseMarkdown(match[1]);
    processTokens(tokens, subEnv);
    if (subEnv.text && subEnv.text.rawText.trim().length) {
        env.currentSlide.notes = subEnv.text;
    }

};

fullTokenRules['hr'] = function(token, env) {
    endSlide(env);
    startSlide(env);
};

fullTokenRules['image'] = function(token, env) {
    const style = getStyle(token, {});

    const image = {
        url: attr(token, 'src'),
        width: undefined,
        height: undefined,
        padding: 0,
        offsetX: 0,
        offsetY: 0,
    };
    
    const padding = attr(token, 'pad');
    if (padding) {
        image.padding = parseInt(padding);
    }

    const offsetX = attr(token, 'offset-x');
    if (offsetX) {
        image.offsetX = parseInt(offsetX);
    }
    
    const offsetY = attr(token, 'offset-y');
    if (offsetY) {
        image.offsetY = parseInt(offsetY);
    }
    
    if (hasClass(token, 'background')) {
        env.currentSlide.backgroundImage = image;
    } else {
        env.currentSlide.images.push(image);
    }
};

fullTokenRules['video'] = function(token, env) {
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

fullTokenRules['table_open'] = function(token, env) {
    const style = getStyle(token, {});
    startStyle(style, env);
    env.table = {
        rows: 0,
        columns: 0,
        cells: []
    };
};

fullTokenRules['table_close'] = function(token, env) {
    env.currentSlide.tables.push(env.table);
    endStyle(env);
};

fullTokenRules['thead_open'] = NO_OP;
fullTokenRules['thead_close'] = NO_OP;

fullTokenRules['tbody_open'] = NO_OP;
fullTokenRules['tbody_close'] = NO_OP;


fullTokenRules['tr_open'] = function(token, env) {
    const style = getStyle(token, {});
    startStyle(style, env);
    env.row = [];
};

fullTokenRules['tr_close'] = function(token, env) {
    const row = env.row;
    env.table.cells.push(row);
    env.table.columns = Math.max(env.table.columns, row.length);
    env.table.rows = env.table.cells.length;
    endStyle(env);
};

fullTokenRules['td_open'] = function(token, env) {
    const style = getStyle(token, {
        foregroundColor: {
            opaqueColor: {
                themeColor: 'TEXT1'
            }
        }
    });
    startStyle(style, env);
    startTextBlock(env);
};

fullTokenRules['th_open'] = function(token, env) {
    const style = getStyle(token, {
        bold: true,
        // Note: Non-placeholder elements aren't aware of the slide theme.
        // Set the foreground color to match the primary text color of the
        // theme.
        foregroundColor: {
            opaqueColor: {
                themeColor: 'TEXT1'
            }
        }
    });
    startStyle(style, env);
    startTextBlock(env);
};

fullTokenRules['td_close'] = fullTokenRules['th_close'] = function(token, env) {
    endStyle(env);
    env.row.push(env.text);
    startTextBlock(env);
};

fullTokenRules['generated_image'] = function(token, env) {
    const image = {
        source: token.content,
        type: token.info.trim(),
        width: undefined,
        height: undefined,
        style: attr(token, 'style'),
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

function camelize(str) {
    return str.replace(/-([a-z])/g, function (g) {
      return g[1].toUpperCase();
    });
}

function convertCssRule(rule, style = {}) {
    let applyRule = (name, callback) => {
        let value = rule[name] || rule[camelize(name)];
        if (value) {
            callback(value);
        }
    }
    applyRule('color', (value) => {
        style.foregroundColor = parseColorString(value);
    })
    applyRule('background-color', (value) => {
        style.backgroundColor = parseColorString(value);

    });
    applyRule('font-weight', (value) => {
        if (value == 'bold') {
            style.bold = true;
        }
    });
    applyRule('font-style', (value) => {
        if (value == 'italic') {
            style.italic = true;
        }
    });
    applyRule('text-decoration', (value) => {
        if (value == 'underline') {
            style.underline = true;
        } else if (value == 'line-through') {
            style.strikethrough = true;
        }
    });
    applyRule('font-family', (value) => {
        style.fontFamily = value;

    });
    applyRule('font-variant', (value) => {
        if (value == 'small-caps') {
            style.smallCaps = true;
        }    
    });
    applyRule('font-size', (value) => {
        // Font size must be expressed in points
        const match = value.match(/(\d+)(?:pt)?/);
        if (!match) {
            debug('Invalid font-size value:', value);
        } else {
            style.fontSize = {
                magnitude: match[1],
                unit: 'PT'
            };
        }
    });
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

function getStyle(token, style = {}) {
    applyCssStyle(token, style);
    return style;
}

function applyCssStyle(token, style) {
    if (!token.attrs) {
        return;
    }
    for(let attr of token.attrs) {
        let name = attr.name || attr[0];
        let value = attr.value || attr[1];
        if (name == 'style') {
            const dummyRule = inlineStylesParse.declarationsToRule(value);
            const css = nativeCSS.convert(dummyRule);
            convertCssRule(css['dummy'], style);
            break;
        }
    }
}


module.exports = extractSlides;
