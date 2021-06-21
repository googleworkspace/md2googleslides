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
import fs from 'fs';
import request from 'request-promise-native';

const debug = Debug('md2gslides');

/**
 * Uploads a local file to temporary storage so it is HTTP/S accessible.
 *
 * Currently uses https://file.io for free emphemeral file hosting.
 *
 * @param {string} filePath -- Local path to image to upload
 * @returns {Promise<string>} URL to hosted image
 */
async function uploadLocalImage(filePath: string): Promise<string> {
  debug('Registering file %s', filePath);
  const stream = fs.createReadStream(filePath);
  try {
    const params = {
      file: stream,
    };
    const res = await request.post({
      url: 'https://file.io?expires=1h',
      formData: params,
    });
    const responseData = JSON.parse(res);
    if (!responseData.success) {
      debug('Unable to upload file: %O', responseData);
      throw res;
    }
    debug('Temporary link: %s', responseData.link);
    return responseData.link;
  } finally {
    stream.destroy();
  }
}

export default uploadLocalImage;
