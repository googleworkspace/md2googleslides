import sharp from 'sharp';
import tmp from 'tmp-promise';
import {ImageDefinition} from '../slides.js';
import puppeteer from "puppeteer";

import Debug from 'debug';
const debug = Debug('md2gslides');
tmp.setGracefulCleanup();


// given a dom string and one or more Urls, render the DOM
// to a page and then generate an image of it.
async function renderDOM(image: ImageDefinition) {
  if(!image.source) {
    throw "Error: detected an html fence with no html inside"
  }

  const html = `
    <html>
    <head>
    <body>
    ${image.source}
    </body>
    </head>
    </html>
    `;
  // create the browser, and set the content of the page
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);

  // grab the content and make an image from it
  const content = await page.$("#DOMtoImage");
  if(!content) { throw "Error: no node found with id `DOMtoImage`"; }
  const boundingBox = await content.boundingBox();
  image.width = boundingBox!.width;
  image.height= boundingBox!.height;
  const imageBuffer = await content.screenshot({ omitBackground: true });

  // close the page and browser
  await page.close();
  await browser.close();

  const path = await tmp.tmpName({postfix: '.png'});
  await sharp(imageBuffer, {density: 2400}).png().toFile(path);
  return path;
}

export default renderDOM;