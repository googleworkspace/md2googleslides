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

import Debug from 'debug';
// @ts-ignore
import mathJax from 'mathjax-node';
import renderSVG from './svg';
import {ImageDefinition} from '../slides';
import assert from 'assert';

const debug = Debug('md2gslides');
let mathJaxInitialized = false;

function lazyInitMathJax(): void {
  if (mathJaxInitialized) {
    return;
  }
  mathJax.config({
    MathJax: {
      SVG: {
        scale: 500,
      },
    },
  });
  mathJax.start();
  mathJaxInitialized = true;
}

function formatFor(expression: string): string {
  return expression.trim().startsWith('<math>') ? 'MathML' : 'TeX';
}

function addOrMergeStyles(svg: string, style?: string): string {
  if (!style) {
    return svg;
  }
  const match = svg.match(/(<svg[^>]+)(style="([^"]+)")([^>]+>)/);
  if (match) {
    return (
      svg.slice(0, match[1].length) +
      `style="${style};${match[3]}"` +
      svg.slice(match[1].length + match[2].length)
    );
  } else {
    const i = svg.indexOf('>');
    return svg.slice(0, i) + ` style="${style}"` + svg.slice(i);
  }
}

async function renderMathJax(image: ImageDefinition): Promise<string> {
  debug('Generating math image: %O', image);
  assert(image.source);
  lazyInitMathJax();
  const out = await mathJax.typeset({
    math: image.source,
    format: formatFor(image.source),
    svg: true,
  });
  image.source = addOrMergeStyles(out.svg, image.style);
  image.type = 'svg';
  return await renderSVG(image);
}

export default renderMathJax;
