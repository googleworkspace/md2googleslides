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

import Debug from 'debug';
import extend from 'extend';
import Token from 'markdown-it/lib/token';
import parse5, {Element} from 'parse5';
import fileUrl from 'file-url';
import {SlideDefinition, StyleDefinition} from '../slides';
import parseMarkdown from './parser';
import {Context} from './env';
import highlightSyntax from './syntax_highlight';
import {parseStyleSheet, parseInlineStyle, updateStyleDefinition} from './css';
import assert from 'assert';

const debug = Debug('md2gslides');

type MarkdownRuleFn = (token: Token, context: Context) => void;
interface MarkdownRules {
  [k: string]: MarkdownRuleFn;
}

interface VideoToken extends Token {
  service: string;
  videoID: string;
}

const inlineTokenRules: MarkdownRules = {};
const fullTokenRules: MarkdownRules = {};

let ruleSet: MarkdownRules;

function attr(token: Token, name: string): string | undefined {
  if (!token.attrs) {
    return undefined;
  }
  const attr = token.attrs.find(a => a[0] === name);
  if (!attr) {
    return undefined;
  }
  return attr[1];
}

function hasClass(token: Token, cls: string): boolean {
  return cls === attr(token, 'class');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isVideo(token: any): token is VideoToken {
  return token.service !== undefined && token.videoID !== undefined;
}

function processMarkdownToken(token: Token, context: Context): void {
  debug('Token: %O', token);
  const rule = ruleSet[token.type];
  if (rule) {
    rule(token, context);
  } else {
    debug('Ignoring token %s', token.type);
  }
}

function processTokens(tokens: Token[], context: Context): void {
  tokens.forEach((token, index) => {
    if (token.type === 'hr' && index === 0) {
      return; // Skip leading HR since no previous slide
    }
    processMarkdownToken(token, context);
  });
}

function applyTokenStyle(
  token: Token,
  style: StyleDefinition
): StyleDefinition {
  if (!token.attrs) {
    return style;
  }
  const styleAttr = token.attrs.find(attr => attr[0] === 'style');
  if (styleAttr === undefined) {
    return style;
  }

  const css = parseInlineStyle(styleAttr[1]);
  updateStyleDefinition(css, style);
  return style;
}

// Rules for processing markdown tokens

// These rules are specific to parsing markdown in an inline context.

inlineTokenRules['heading_open'] = (token, context) => {
  const style = applyTokenStyle(token, {bold: true});
  context.startStyle(style); // TODO - Better style for inline headers
};

inlineTokenRules['heading_close'] = (token, context) => context.endStyle();

inlineTokenRules['inline'] = (token, context) => {
  if (!token.children) {
    return;
  }
  for (const child of token.children) {
    processMarkdownToken(child, context);
  }
};

inlineTokenRules['html_inline'] = (token, context) => {
  const fragment = context.inlineHtmlContext
    ? parse5.parseFragment(context.inlineHtmlContext, token.content)
    : parse5.parseFragment(token.content);
  if (fragment.childNodes && fragment.childNodes.length) {
    const node = fragment.childNodes[0] as Element;
    const style: StyleDefinition = {};

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
      case '#comment':
        // Depending on spacing, comment blocks
        // sometimes appear as inline elements
        fullTokenRules['html_block'](token, context);
        return;
      default:
        throw new Error('Unsupported inline HTML element: ' + node.nodeName);
    }

    const styleAttr = node.attrs.find(
      (attr: {name: string}) => attr.name === 'style'
    );
    if (styleAttr) {
      const css = parseInlineStyle(styleAttr.value);
      updateStyleDefinition(css, style);
    }
    context.inlineHtmlContext = node;
    context.startStyle(style);
  } else {
    context.endStyle();
  }
};

inlineTokenRules['text'] = (token, context) => {
  const style = applyTokenStyle(token, {});
  context.startStyle(style);
  context.appendText(token.content);
  context.endStyle();
};

inlineTokenRules['paragraph_open'] = (token, context) => {
  assert(context.currentSlide);
  if (hasClass(token, 'column')) {
    context.markerParagraph = true;
    const body = {
      text: context.text,
      images: context.images,
      videos: context.videos,
    };
    context.images = [];
    context.videos = [];
    context.currentSlide.bodies.push(body);
    context.startTextBlock();
  } else if (!context.text) {
    context.startTextBlock();
  }

  const layout = attr(token, 'layout');
  // If we have a layout attribute set this on the slide so we can select the
  // right master template when building the deck
  if (layout !== undefined && layout !== '') {
    context.currentSlide.customLayout = layout;
  }
};

inlineTokenRules['paragraph_close'] = (token, context) => {
  if (context.markerParagraph) {
    // Empty column marker, just clear flag
    context.markerParagraph = false;
  } else {
    context.appendText('\n');
  }
};

inlineTokenRules['fence'] = (token, context) => {
  const style = applyTokenStyle(token, {fontFamily: 'Courier New'});
  context.startStyle(style);
  const language = token.info ? token.info.trim() : undefined;
  if (language) {
    highlightSyntax(token.content, language, context);
  } else {
    // For code blocks, replace line feeds with vertical tabs to keep
    // the block as a single paragraph. This avoid the extra vertical
    // space that appears between paragraphs
    context.appendText(token.content.replace(/\n/g, '\u000b'));
  }
  context.appendText('\n');
  context.endStyle();
};

inlineTokenRules['em_open'] = (token, context) => {
  const style = applyTokenStyle(token, {italic: true});
  context.startStyle(style);
};

inlineTokenRules['em_close'] = (token, context) => context.endStyle();

inlineTokenRules['s_open'] = (token, context) => {
  const style = applyTokenStyle(token, {strikethrough: true});
  context.startStyle(style);
};

inlineTokenRules['s_close'] = (token, context) => context.endStyle();

inlineTokenRules['strong_open'] = (token, context) => {
  const style = applyTokenStyle(token, {bold: true});
  context.startStyle(style);
};

inlineTokenRules['strong_close'] = (token, context) => context.endStyle();

inlineTokenRules['link_open'] = (token, context) => {
  const style = applyTokenStyle(token, {
    link: {
      url: attr(token, 'href') ?? '#',
    },
  });
  context.startStyle(style);
};

inlineTokenRules['link_close'] = (token, context) => context.endStyle();

inlineTokenRules['code_inline'] = (token, context) => {
  const style = applyTokenStyle(token, {fontFamily: 'Courier New'});
  context.startStyle(style);
  context.appendText(token.content);
  context.endStyle();
};

inlineTokenRules['hardbreak'] = (token, context) =>
  context.appendText('\u000b');

inlineTokenRules['softbreak'] = (token, context) => context.appendText(' ');

inlineTokenRules['blockquote_open'] = (token, context) => {
  // TODO - More interesting styling for block quotes
  const style = applyTokenStyle(token, {italic: true});
  context.startStyle(style);
};

inlineTokenRules['blockquote_close'] = (token, context) => context.endStyle();

inlineTokenRules['emoji'] = (token, context) =>
  context.appendText(token.content);

inlineTokenRules['bullet_list_open'] = inlineTokenRules['ordered_list_open'] = (
  token,
  context
) => {
  assert(context.text);
  const style = applyTokenStyle(token, {});
  context.startStyle(style);
  if (context.list) {
    if (context.list.tag !== token.tag) {
      throw new Error('Nested lists must match parent style');
    }
    context.list.depth += 1;
  } else {
    context.list = {
      depth: 0,
      tag: token.tag,
      start: context.text.rawText.length,
    };
  }
};

inlineTokenRules['bullet_list_close'] = inlineTokenRules['ordered_list_close'] =
  (token, context) => {
    assert(context.list);
    assert(context.text);
    if (context.list.depth === 0) {
      // TODO - Support nested lists with mixed styles when API supports it.
      // Currently nested lists must match the parent style.
      context.text.listMarkers.push({
        start: context.list.start,
        end: context.text.rawText.length,
        type: token.tag === 'ul' ? 'unordered' : 'ordered',
      });
      context.list = undefined;
    } else {
      context.list.depth -= 1;
    }
    context.endStyle();
  };

inlineTokenRules['list_item_open'] = (token, context) => {
  assert(context.list);
  const style = applyTokenStyle(token, {});
  context.startStyle(style);
  context.appendText(new Array(context.list.depth + 1).join('\t'));
};

inlineTokenRules['list_item_close'] = (token, context) => context.endStyle();

// Additional rules for processing the entire document
// Extends inline rules with support for additional
// tokens that only make sense in the context of a slide
// or presentation
extend(fullTokenRules, inlineTokenRules);

fullTokenRules['heading_open'] = (token, context) => {
  const style = applyTokenStyle(token, {});
  context.startTextBlock();
  context.startStyle(style);
  assert(context.text);
  context.text.big = hasClass(token, 'big');
};

fullTokenRules['heading_close'] = (token, context) => {
  assert(context.currentSlide);
  if (token.tag === 'h1') {
    context.currentSlide.title = context.text;
  } else if (token.tag === 'h2') {
    context.currentSlide.subtitle = context.text;
  } else {
    debug('Ignoring header element %s', token.tag);
  }
  context.endStyle();
  context.startTextBlock();
};

fullTokenRules['html_block'] = (token, context) => {
  assert(context.currentSlide);
  const re = /<!--([\s\S]*)-->/m;
  const match = re.exec(token.content);
  if (match === null) {
    throw new Error('Unsupported HTML block: ' + token.content);
  }
  // Since the notes can contain unparsed markdown, create a new environment
  // to process it so we don't inadvertently lose state. Just carry
  // forward the notes from the current slide to append to
  const subContext = new Context(context.css);
  ruleSet = inlineTokenRules;
  if (context.currentSlide.notes) {
    subContext.text = context.currentSlide.notes;
  } else {
    subContext.startTextBlock();
  }
  const tokens = parseMarkdown(match[1]);
  processTokens(tokens, subContext);
  if (subContext.text && subContext.text.rawText.trim().length) {
    context.currentSlide.notes = subContext.text;
  }
  ruleSet = fullTokenRules;
};

fullTokenRules['hr'] = (token, context) => {
  context.endSlide();
  context.startSlide();
};

fullTokenRules['image'] = (token, context) => {
  assert(context.currentSlide);
  let url = attr(token, 'src');
  if (url && !url.match(/(file|https?):/)) {
    url = fileUrl(url);
  }
  const image = {
    url: url,
    width: 0,
    height: 0,
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
    context.currentSlide.backgroundImage = image;
  } else {
    context.images.push(image);
  }
};

fullTokenRules['video'] = (token, context) => {
  if (!isVideo(token)) {
    return;
  }
  if (token.service !== 'youtube') {
    throw new Error('Only YouTube videos allowed');
  }
  // Assume 16:9 aspect ratio
  const video = {
    width: 1600,
    height: 900,
    autoPlay: true,
    id: token.videoID,
  };
  context.videos.push(video);
};

fullTokenRules['table_open'] = (token, context) => {
  const style = applyTokenStyle(token, {});
  context.startStyle(style);
  context.table = {
    rows: 0,
    columns: 0,
    cells: [],
  };
};

fullTokenRules['table_close'] = (token, context) => {
  assert(context.currentSlide);
  assert(context.table);
  context.currentSlide.tables.push(context.table);
  context.endStyle();
};

fullTokenRules['thead_open'] = () => {};
fullTokenRules['thead_close'] = () => {};

fullTokenRules['tbody_open'] = () => {};
fullTokenRules['tbody_close'] = () => {};

fullTokenRules['tr_open'] = (token, context) => {
  const style = applyTokenStyle(token, {});
  context.startStyle(style);
  context.row = [];
};

fullTokenRules['tr_close'] = (token, context) => {
  assert(context.table);
  const row = context.row;
  context.table.cells.push(row);
  context.table.columns = Math.max(context.table.columns, row.length);
  context.table.rows = context.table.cells.length;
  context.endStyle();
};

fullTokenRules['td_open'] = (token, context) => {
  const style = applyTokenStyle(token, {
    foregroundColor: {
      opaqueColor: {
        themeColor: 'TEXT1',
      },
    },
  });
  context.startStyle(style);
  context.startTextBlock();
};

fullTokenRules['th_open'] = (token, context) => {
  const style = applyTokenStyle(token, {
    bold: true,
    // Note: Non-placeholder elements aren't aware of the slide theme.
    // Set the foreground color to match the primary text color of the
    // theme.
    foregroundColor: {
      opaqueColor: {
        themeColor: 'TEXT1',
      },
    },
  });
  context.startStyle(style);
  context.startTextBlock();
};

fullTokenRules['td_close'] = fullTokenRules['th_close'] = (token, context) => {
  assert(context.text);
  context.endStyle();
  context.row.push(context.text);
  context.startTextBlock();
};

fullTokenRules['generated_image'] = (token, context) => {
  assert(context.currentSlide);
  const image = {
    source: token.content,
    type: token.info.trim(),
    width: 0,
    height: 0,
    style: attr(token, 'style'),
    padding: 0,
    offsetX: 0,
    offsetY: 0,
  };
  const padding = attr(token, 'pad');
  if (padding) {
    image.padding = parseInt(padding);
  }
  if (hasClass(token, 'background')) {
    context.currentSlide.backgroundImage = image;
  } else {
    context.images.push(image);
  }
};

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
export default function extractSlides(
  markdown: string,
  stylesheet?: string
): SlideDefinition[] {
  const tokens = parseMarkdown(markdown);
  const css = parseStyleSheet(stylesheet);
  const context = new Context(css);
  ruleSet = fullTokenRules; // TODO - Make not global
  processTokens(tokens, context);
  context.done();
  debug('Slides %O', context.slides);
  return context.slides;
}
