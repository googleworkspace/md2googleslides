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
const Promise = require('promise');
const extractSlides = require('./extract_slides');
const Presentation = require('./presentation');
const matchLayout = require('./match_layout');
const probeImageSize = require('probe-image-size');
const { maybeGenerateImage } = require('./generate_image');
const promiseRetry = require('promise-retry');
const URL = require('url').URL;
const fs = require('fs');
const { google } = require('googleapis');
const { uploadLocalImage } = require('./upload_image');

/**
 * Generates slides from Markdown or HTML. Requires an authorized
 * oauth2 client.
 *
 * @example
 *
 *   var SlideGenerator = require('md2slides');
 *   var fs = require('fs');
 *
 *   var oauth2Client = ...; // See Google API client for details
 *   var generator = SlideGenerator.newPresentation(oauth2Client);
 *   var markdown = fs.readFileSync('mydeck.md');
 *   generator.generateFromMarkdown(markdown).then(function(id) {
 *     console.log("Presentation ID: " + id);
 *   });
 *
 * @see https://github.com/google/google-api-nodejs-client
 */
class SlideGenerator {
    /**
     * @param {Object} api Authorized API client instance
     * @param {Object} presentation Initial presentation data
     * @private
     */
    constructor(api, presentation) {
        this.presentation = new Presentation(presentation);
        this.api = api;
    }

    /**
     * Returns a generator that writes to a new blank presentation.
     *
     * @param {google.auth.OAuth2} oauth2Client User credentials
     * @param {string} title Title of presentation
     * @returns {Promise.<SlideGenerator>}
     */
    static async newPresentation(oauth2Client, title) {
        let api = google.slides({ version: 'v1', auth: oauth2Client});
        let res = await api.presentations.create({
            resource: {
                title: title
            }
        });
        let presentation = res.data;
        return new SlideGenerator(api, presentation);
    }

    /**
     * Returns a generator that writes to an existing presentation.
     *
     * @param {google.auth.OAuth2} oauth2Client User credentials
     * @returns {Promise.<SlideGenerator>}
     */
    static async forPresentation(oauth2Client, presentationId) {
        let api = google.slides({ version: 'v1', auth: oauth2Client});
        let res = await api.presentations.get({presentationId: presentationId});
        let presentation = res.data;
        return new SlideGenerator(api, presentation);
    }

    /**
     * Generate slides from markdown
     *
     * @param {String} markdown Markdown to import
     * @returns {Promise.<String>} ID of generated slide
     */
    async generateFromMarkdown(markdown, css = null) {
        this.slides = extractSlides(markdown, css);
        await this.generateImages();
        await this.probeImageSizes();
        await this.uploadLocalImages();
        await this.updatePresentation(this.createSlides());
        await this.reloadPresentation();
        await this.updatePresentation(this.populateSlides());
        return this.presentation.data.presentationId;
    }

    generateImages() {
        const promises = [];
        for(let slide of this.slides) {
            if (slide.backgroundImage) {
                promises.push(maybeGenerateImage(slide.backgroundImage));
            }
            for(let image of slide.images) {
                promises.push(maybeGenerateImage(image));
            }
        }
        return Promise.all(promises);
    }

    uploadLocalImages() {
        const promises = [];
        const uploadImageifLocal = async (image) => {
            let parsedUrl = new URL(image.url);
            if (parsedUrl.protocol !== 'file:') {
                return;
            }
            image.url = await uploadLocalImage(parsedUrl.pathname);
            return;
        };
        for(let slide of this.slides) {
            if (slide.backgroundImage) {
                promises.push(uploadImageifLocal(slide.backgroundImage));
            }
            for(let image of slide.images) {
                promises.push(uploadImageifLocal(image));
            }
        }
        return Promise.all(promises);
    }
    /**
     * Fetches the image sizes for each image in the presentation. Allows
     * for more accurate layout of images.
     *
     * Image sizes are stored as data attributes on the image elements.
     *
     * @returns {Promise.<*>}
     * @private
     */
    probeImageSizes() {
        const probe = function(image) {
            let promise;
            let parsedUrl = new URL(image.url);

            if (parsedUrl.protocol == 'file:') {
                let stream = fs.createReadStream(parsedUrl.pathname);
                promise = probeImageSize(stream).finally(() => stream.destroy());
            } else {
                const retryOptions = {
                    retries: 3,
                    randomize: true,
                };
        
                promise = promiseRetry((retry) => {
                    let options = { timeout: 5000 };
                    return probeImageSize(image.url, options).catch(err => {
                        if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                            retry(err);
                        }
                        throw err;
                    });
                }, retryOptions);
            }
            return promise.then(size => {
                image.width = size.width;
                image.height = size.height;
            });
        };

        const promises = [];
        for(let slide of this.slides) {
            if (slide.backgroundImage) {
                promises.push(probe(slide.backgroundImage));
            }
            for(let image of slide.images) {
                promises.push(probe(image));
            }
        }
        return Promise.all(promises);
    }

    /**
     * Removes any existing slides from the presentation.
     *
     * @returns {Promise.<*>}
     */
    async erase() {
        debug('Erasing previous slides');
        if (this.presentation.data.slides == null) {
            return Promise.resolve(null);
        }

        const batch = { requests: [] };
        for(let slide of this.presentation.data.slides) {
            batch.requests.push({
                deleteObject: {
                    objectId: slide.objectId
                }
            });
        }
        return await this.api.presentations.batchUpdate({
            presentationId: this.presentation.data.presentationId,
            resource: batch});
    }

    /**
     * 1st pass at generation -- creates slides using the apporpriate
     * layout based on the content.
     *
     * Note this only returns the batch requests, but does not execute it.
     *
     * @returns {{requests: Array}}
     */
    createSlides() {
        debug('Creating slides');
        const batch = {
            requests: []
        };
        for(let slide of this.slides) {
            const layout = matchLayout(this.presentation, slide);
            if (!layout) {
                throw new Error(`Unable to determine layout for slide # ${slide.index}`);
            }
            layout.appendCreateSlideRequest(batch.requests);
        }
        return batch;
    }

    /**
     * 2nd pass at generation -- fills in placeholders and adds any other
     * elements to the slides.
     *
     * Note this only returns the batch requests, but does not execute it.
     *
     * @returns {{requests: Array}}
     */
    populateSlides() {
        debug('Populating slides');
        const batch = {
            requests: []
        };
        for(let slide of this.slides) {
            slide.layout.appendContentRequests(batch.requests);
        }
        return batch;
    }

    /**
     * Updates the remote presentation.
     *
     * @param batch Batch of operations to execute
     * @returns {Promise.<*>}
     */
    async updatePresentation(batch) {
        debug(JSON.stringify(batch, null, 2));
        if (batch.requests.length == 0) {
            return Promise.resolve(null);
        }
        return await this.api.presentations.batchUpdate({
            presentationId: this.presentation.data.presentationId,
            resource: batch});
    }

    /**
     * Refreshes the local copy of the presentation.
     *
     * @returns {Promise.<*>}
     */
    async reloadPresentation() {
        let res = await this.api.presentations.get({presentationId: this.presentation.data.presentationId});
        this.presentation.data = res.data;
        return this.presentation;
    }
}

module.exports = SlideGenerator;

