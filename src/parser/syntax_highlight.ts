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

import low from 'lowlight';
import {Context} from './env';
import {updateStyleDefinition} from './css';
import {StyleDefinition} from '../slides';

type RuleFn = (node: lowlight.HastNode, context: Context) => void;
interface Rules {
  [key: string]: RuleFn;
}

const hastRules: Rules = {};

// Type guard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isTextNode(node: any): node is lowlight.AST.Text {
  return node.value !== undefined;
}

// Type guard
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isElementNode(node: any): node is lowlight.AST.Element {
  return node.properties !== undefined;
}

function processHastNode(node: lowlight.HastNode, context: Context): void {
  if (node.type !== 'text' && node.type !== 'element') {
    return;
  }
  const ruleName = node.type === 'text' ? 'text' : node.tagName;
  const fn = hastRules[ruleName];
  if (!fn) {
    return;
  }
  fn(node, context);
}

function extractStyle(
  node: lowlight.HastNode,
  cssRules: object
): StyleDefinition {
  if (!isElementNode(node)) {
    return;
  }
  const classNames = node.properties['className'];
  let style = {};
  for (const cls of classNames || []) {
    const normalizedClassName = cls.replace(/-/g, '_');
    const rule = cssRules[normalizedClassName];
    if (rule) {
      style = updateStyleDefinition(rule, style);
    }
  }
  return style;
}

hastRules['text'] = (node, context) => {
  if (!isTextNode(node)) {
    return;
  }
  // For code blocks, replace line feeds with vertical tabs to keep
  // the block as a single paragraph. This avoid the extra vertical
  // space that appears between paragraphs
  context.appendText(node.value.replace(/\n/g, '\u000b'));
};

hastRules['span'] = (node, context) => {
  if (!isElementNode(node)) {
    return;
  }
  const style = extractStyle(node, context.css);
  context.startStyle(style);
  for (const childNode of node.children || []) {
    processHastNode(childNode as lowlight.HastNode, context);
  }
  context.endStyle();
};

function highlightSyntax(
  content: string,
  language: string,
  context: Context
): void {
  const highlightResult = low.highlight(language, content);
  for (const node of highlightResult.value) {
    processHastNode(node, context);
  }
}

export default highlightSyntax;
