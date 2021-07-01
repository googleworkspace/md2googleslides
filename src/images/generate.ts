// Copyright 2018 Google Inc.
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
import renderSVG from './svg';
import renderMathJax from './/mathjax';
import {ImageDefinition} from '../slides';
import assert from 'assert';

const debug = Debug('md2gslides');

const renderers: {[key: string]: (img: ImageDefinition) => Promise<String>} = {
  svg: renderSVG,
  math: renderMathJax,
};

/**
 * Checks to see if the image requires rasterization (e.g. SVG, MathJAX, etc)
 * @param {Image} image to generate if needed
 * @return {Promise<Image>} Promise resolved with image URL
 */
async function maybeGenerateImage(
  image: ImageDefinition
): Promise<ImageDefinition> {
  if (image.url) {
    debug('Image already rasterized: %s', image.url);
    return image;
  }

  assert(image.type);

  const imageType = image.type.trim().toLowerCase();

  const renderer = renderers[imageType];
  if (renderer === undefined) {
    throw 'Unsupported generated image: ' + image.source;
  }
  const filePath = await renderer(image);
  image.url = 'file://' + filePath;
  debug('Local image path: %s', image.url);
  return image;
}

export default maybeGenerateImage;
