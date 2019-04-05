// Copyright 2019 Google Inc.
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

import parseColor from 'parse-color';
import Debug from 'debug';
import inlineStylesParse from 'inline-styles-parse';
import nativeCSS from 'native-css';
import { Color, StyleDefinition } from '../slides';
import * as _ from 'lodash';

const debug = Debug('md2gslides');

export interface CssRule {
    [key: string]: string;
}
export interface Stylesheet {
    [key: string]: CssRule;
}

function parseColorString(hexString: string): Color {
    const c = parseColor(hexString);
    if (!c.rgba) {
        return;
    }
    return {
        opaqueColor: {
            rgbColor: {
                red: c.rgba[0] / 255,
                green: c.rgba[1] / 255,
                blue: c.rgba[2] / 255,
            },
        },
    };
}

function normalizeKeys(css: CssRule): CssRule {
    let normalized = _.mapKeys(css, (value, key) => _.camelCase(key));
    return normalized;
}

export function parseStyleSheet(stylesheet: string): Stylesheet {
    return nativeCSS.convert(stylesheet) as Stylesheet;
}

export function parseInlineStyle(inlineStyle: string): CssRule {
    const dummyRule = inlineStylesParse.declarationsToRule(inlineStyle);
    let css = nativeCSS.convert(dummyRule);
    return css['dummy'] as CssRule;
}

export function updateStyleDefinition(css: CssRule, style: StyleDefinition): StyleDefinition {
    let normalizedCss = normalizeKeys(css);
    for (let [key, value] of Object.entries(normalizedCss)) {
        switch (key) {
            case 'color':
                style.foregroundColor = parseColorString(value);
                break;
            case 'backgroundColor':
                style.backgroundColor = parseColorString(value);
                break;
            case 'fontWeight':
                if (value === 'bold') {
                    style.bold = true;
                }
                break;
            case 'fontStyle':
                if (value === 'italic') {
                    style.italic = true;
                }
                break;
            case 'fontStyle':
                if (value === 'underline') {
                    style.underline = true;
                } else if (value === 'line-through') {
                    style.strikethrough = true;
                }
                break;
            case 'fontFamily':
                style.fontFamily = value;
                break;
            case 'fontVariant':
                if (value === 'small-caps') {
                    style.smallCaps = true;
                }
                break;
            case 'fontSize':
                // Font size must be expressed in points
                const match = (value as string).match(/(\d+)(?:pt)?/);
                if (!match) {
                    debug('Invalid font-size value: %s', value);
                    return;
                }
                style.fontSize = {
                    magnitude: Number.parseInt(match[1]),
                    unit: 'PT',
                };
                break;
            default:
                debug('Ignoring CSS rule %s: %o', key, value);
        }
    }
    return style;
}
