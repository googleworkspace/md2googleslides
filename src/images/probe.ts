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
import probeImageSize from 'probe-image-size';
import {ImageDefinition} from '../slides.js';
import retry from 'promise-retry';
import fs from 'fs';
import {URL} from 'url';
import assert from 'assert';

const debug = Debug('md2gslides');
const retriableCodes = ['ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT'];

const retryOptions = {
  retries: 3,
  randomize: true,
};

interface ImageSize {
  width: number;
  height: number;
}

async function probeUrl(url: string): Promise<ImageSize> {
  return await retry(async doRetry => {
    try {
      return await probeImageSize(url);
    } catch (err:any) {
      if (retriableCodes.includes(err.code) || err.status >= 500) {
        doRetry(err);
      }
      throw err;
    }
  }, retryOptions);
}

async function probeFile(path: string): Promise<ImageSize> {
  const stream = fs.createReadStream(path);
  try {
    return await probeImageSize(stream);
  } finally {
    stream.destroy();
  }
}

async function probeImage(image: ImageDefinition): Promise<ImageDefinition> {
  debug('Probing image size: %s', image.url);
  assert(image.url);
  const parsedUrl = new URL(image.url);
  let size;
  if(parsedUrl.protocol === 'file:'){
    size = await probeFile(parsedUrl.pathname);
  } else {
    size = await probeUrl(image.url);
  }

  // if there's a custom height/width, we need to scale
  let scaleRatio = 1;
  if(image.height || image.width) {
    scaleRatio = Math.min(
      size.width  / image.width,
      size.height / image.height
    );
  }

  image.width  = size.width  * scaleRatio;
  image.height = size.height * scaleRatio;
  return image;
}

export default probeImage;
