import markdownIt from 'markdown-it';
import Token from 'markdown-it/lib/token';
import attrs from 'markdown-it-attrs';
import lazyHeaders from 'markdown-it-lazy-headers';
import emoji from 'markdown-it-emoji';
import expandTabs from 'markdown-it-expand-tabs';
import video from 'markdown-it-video';
import customFence from 'markdown-it-fence';
function generatedImage(md): void {
    return customFence(md, 'generated_image', {
        marker: '$',
        validate: () => true,
    });
}

const mdOptions = {
    html: true,
    langPrefix: 'highlight ',
    linkify: false,
    breaks: false,
};

const parser = markdownIt(mdOptions)
    .use(attrs)
    .use(lazyHeaders)
    .use(emoji, { shortcuts: {} })
    .use(expandTabs, { tabWidth: 4 })
    .use(generatedImage)
    .use(video, { youtube: { width: 640, height: 390 } });

function parseMarkdown(markdown: string): Token[] {
    return parser.parse(markdown, {});
}

export default parseMarkdown;
