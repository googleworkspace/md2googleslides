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
const ApiClient = require('./api_client');
const extractSlides = require('./extract_slides');
const Presentation = require('./presentation');
const matchLayout = require('./match_layout');
const probeImageSize = require('probe-image-size');
const promiseRetry = require('promise-retry');

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
     * @param {APIClient] apiClient Authorized API client instance
     * @param {Object} presentation Initial presentation data
     * @private
     */
    constructor(apiClient, presentation) {
        this.presentation = new Presentation(presentation);
        this.apiClient = apiClient;
    }

    /**
     * Returns a generator that writes to a new blank presentation.
     *
     * @param {google.auth.OAuth2} oauth2Client User credentials
     * @param {string} title Title of presentation
     * @returns {Promise.<SlideGenerator>}
     */
    static newPresentation(oauth2Client, title) {
        let apiClient = new ApiClient(oauth2Client);
        return apiClient.createPresentation({
            resource: {
                title: title
            }
        }).then(response => new SlideGenerator(apiClient, response.data));
    }

    /**
     * Returns a generator that copies an existing presentation.
     *
     * @param {google.auth.OAuth2} oauth2Client User credentials
     * @param {string} title Title of presentation
     * @param {string} presentationId ID of presentation to copy
     * @returns {Promise.<SlideGenerator>}
     */
    static copyPresentation(oauth2Client, title, presentationId) {
        let apiClient = new ApiClient(oauth2Client);
        return apiClient.copyPresentation({
                fileId: presentationId,
                resource: {
                    name: title
                }
        }).then(response => SlideGenerator.forPresentation(oauth2Client, response.data.id));
    }

    /**
     * Returns a generator that writes to an existing presentation.
     *
     * @param {google.auth.OAuth2} oauth2Client User credentials
     * @param {string} presentationId ID of presentation to use
     * @returns {Promise.<SlideGenerator>}
     */
    static forPresentation(oauth2Client, presentationId) {
        let apiClient = new ApiClient(oauth2Client);
        return apiClient.getPresentation({presentationId: presentationId})
            .then(response => new SlideGenerator(apiClient, response.data));
    }

    /**
     * Generate slides from markdown
     *
     * @param {String} markdown Markdown to import
     * @returns {Promise.<String>} ID of generated slide
     */
    generateFromMarkdown(markdown, css = null) {
        this.slides = extractSlides(markdown, css);
        return this.probeImageSizes()
            .then(() => this.updatePresentation(this.createSlides()))
            .then(() => this.reloadPresentation())
            .then(() => this.updatePresentation(this.populateSlides()))
            .then(() => this.presentation.data.presentationId);
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
        const retryOptions = {
            retries: 3,
            randomize: true,
        };
        const probe = function(image) {
            return promiseRetry((retry) => {
                return probeImageSize({ url: image.url, timeout: 5000 })
                    .then(size => {
                        image.width = size.width;
                        image.height = size.height;
                    }).catch(err => {
                        if (err.code == 'ECONNRESET' || err.code == 'ETIMEDOUT') {
                            retry(err);
                        }
                        throw err;
                    });
            }, retryOptions);
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
    erase() {
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
        return this.apiClient.batchUpdate({
            presentationId: this.presentation.data.presentationId,
            resource: batch})
            .then((response) => response.data);
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
            debug('appendContent', slide.layout);
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
    updatePresentation(batch) {
        debug(JSON.stringify(batch, null, 2));
        if (batch.requests.length == 0) {
            return Promise.resolve(null);
        }
        return this.apiClient.batchUpdate({
            presentationId: this.presentation.data.presentationId,
            resource: batch})
            .then((response) => response.data);
    }

    /**
     * Refreshes the local copy of the presentation.
     *
     * @returns {Promise.<*>}
     */
    reloadPresentation() {
        return this.apiClient.getPresentation({presentationId: this.presentation.data.presentationId})
            .then(response => {
                this.presentation.data = response.data;
                return this.presentation;
            });
    }
}

module.exports = SlideGenerator;
