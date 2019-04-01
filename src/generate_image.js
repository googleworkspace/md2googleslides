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

const debug = require('debug')('md2gslides');
const mathJax = require('mathjax-node');
const sharp = require('sharp');
var tmp = require('tmp-promise');

mathJax.config({
    MathJax: {
        SVG: {
            scale: 500
        }
    }
});
mathJax.start();

async function maybeGenerateImage(image) {
    if (image.url) {
        return image;
    }

    let file;
    let type = image.type.toLowerCase();
    if (type.startsWith('math')) {
        let variant = (image.source.trim().startsWith('<math>')) 
        ? 'MathML' 
        : 'TeX';
        file = await renderMathJax(image, variant);
    } else if (type.startsWith('svg')) {
        file = await renderSVG(image);
    } else {
        throw 'Unsupported generated image: ' + image.source;
    }
    image.url = 'file://'+ file;
    return image;
}

async function renderMathJax(image, format = 'TeX') {
    debug('Generating math image');
    let out = await mathJax.typeset({
        math: image.source,
        format: format,
        svg: true,
    });
    if (image.style) {
        let match = out.svg.match(/(<svg[^>]+)(style="([^"]+)")([^>]+>)/);
        if (match) {
            image.source = out.svg.slice(0, match[1].length) + `style="${image.style};${match[3]}"` + out.svg.slice(match[1].length + match[2].length);  
        } else {
            let i = out.svg.indexOf('>');
            image.source = out.svg.slice(0, i) + ` style="${image.style}"` + out.svg.slice(i);    
        }
    } else {
        image.source = out.svg;
    }
    image.type = 'svg';
    return await renderSVG(image);
}

async function renderSVG(image) {
    debug('Generating SVG');
    let path = await tmp.tmpName({ postfix: 'png' });
    let buffer = Buffer.from(image.source);
    try {
        let result = await sharp(buffer, { density: 2400 } ).png().toFile(path);
    } catch(e) {
        throw e;
    }
    return path;
}

exports.maybeGenerateImage = maybeGenerateImage;