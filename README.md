Generate Google Slides from markdown & HTML. Run from the command line or embed in another
application.

This project was developed as an example of how to use the
[Slides API](https://developers.google.com/slides).

While it does not yet produce stunningly beautiful decks, you are encouraged to use
this tool for quickly prototyping presentations.

Contributions are welcome.

## Installation and usage

For command line use, install md2gslides globally:

```sh
npm install -g md2gslides
```

Then get your OAuth client ID credentials:

* Create (or reuse) a developer project at <https://console.developers.google.com>
* Enable Google Slides API at [API library page](https://console.developers.google.com/apis/library)
* Go to [Credentials page](https://console.developers.google.com/apis/credentials) and click "+ Create credentials" at the top
* Select "OAuth client ID" authorization credentials
* Choose type "Computer Application" and give it some name.
* Download client credentials file.
* Copy it to `client_id.json` (name has to match) and save to `~/.md2googleslides`.

After installing, import your slides by running:

```sh
md2gslides slides.md --title "Talk Title"
```

This will generate new Google Slides in your account with title `Talk Title`. 

NOTE: The first time the command is run you will be prompted for authorization. OAuth token
credentials are stored locally in a file named `~/.md2googleslides/credentials.json`.

Each time you will run the above comment, new slide deck will be generated. In order to work on exactly the same
deck, just get the ID of the already generated slides. For example, you can use following command:

```
# To reuse deck available at: https://docs.google.com/presentation/d/<some id>/edit#
md2gslides slides.md --title "Talk Title" --append <some id> --erase
```

## Supported markdown rules

md2gslides uses a subset of the [CommonMark](http://spec.commonmark.org/0.26/) and
[Github Flavored Markdown](https://help.github.com/categories/writing-on-github/) rules for
markdown.

### Slides

Each slide is typically represented by a header, followed by zero or more block elements.

Begin a new slide with a horizontal rule (`---`). The separator
may be omitted for the first slide.

The following examples show how to create slides of various layouts:

#### Title slide

<pre>
    ---

    # This is a title slide
    ## Your name here
</pre>

![Title slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/title_slide.png)

#### Section title slides

<pre>
    ---

    # This is a section title
</pre>

![Section title slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/section_title_slide.png)

#### Section title & body slides

<pre>
    ---

    # Section title & body slide

    ## This is a subtitle

    This is the body
</pre>

![Section title & body slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/section_title_body_slide.png)

#### Title & body slides

<pre>
    ---

    # Title & body slide

    This is the slide body.
</pre>

![Title & body slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/title_body_slide.png)

#### Main point slide

Add `{.big}` to the title to make a slide with one big point

<pre>
    ---

    # This is the main point {.big}
</pre>

![Main point slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/main_point_slide.png)

#### Big number slide

Use `{.big}` on a header in combination with a body too.

<pre>
    ---

    # 100% {.big}

    This is the body
</pre>

![Big number slide](examples/big_number_slide.png)


#### Two column slides

Separate columns with `{.column}`. The marker must appear
on its own line with a blank both before and after.

<pre>
    ---

    # Two column layout

    This is the left column

    {.column}

    This is the right column
</pre>

![Two column slide](https://github.com/googlesamples/md2googleslides/raw/master/examples/two_column_slide.png)

### Themes

`md2googleslides` does not edit or control any theme related options. Just set a base theme you want on Google Slides directly.
Even if you will use `--append` option for deck reuse, theme will be not changed.

### Images

#### Inline images

Images can be placed on slides using image tags. Multiple images
can be included. Mulitple images in a single paragraph are arranged in columns,
mutiple paragraphs arranged as rows.

Note: Images are currently scaled and centered to fit the
slide template.

<pre>
    ---

    # Slides can have images

    ![](https://placekitten.com/900/900)
</pre>

![Slide with image](https://github.com/googlesamples/md2googleslides/raw/master/examples/image_slide.png)

#### Background images

Set the background image of a slide by adding `{.background}` to
the end of an image URL.

<pre>
    ---

    # Slides can have background images

    ![](https://placekitten.com/1600/900){.background}
</pre>

![Slide with background image](https://github.com/googlesamples/md2googleslides/raw/master/examples/background_image_slide.png)

### Videos

Include YouTube videos with a modified image tag.

<pre>
    ---

    # Slides can have videos

    @[youtube](MG8KADiRbOU)
</pre>

![Slide with video](https://github.com/googlesamples/md2googleslides/raw/master/examples/video_slide.png)

### Speaker notes

Include speaker notes for a slide using HTML comments. Text inside
the comments may include markdown for formatting, though only text
formatting is allowed. Videos, images, and tables are ignored inside
speaker notes.

<pre>
    ---

    # Slide title

    ![](https://placekitten.com/1600/900){.background}

    &lt;!--
    These are speaker notes.
    --&gt;
</pre>

### Formatting

Basic formatting rules are allowed, including:

* Bold
* Italics
* Code
* Strikethrough
* Hyperlinks
* Ordered lists
* Unordered lists

The following markdown illustrates a few common styles.

<pre>
**Bold**, *italics*, and ~~strikethrough~~ may be used.

Ordered lists:
1. Item 1
1. Item 2
  1. Item 2.1

Unordered lists:
* Item 1
* Item 2
  * Item 2.1
</pre>

Additionally, a subset of inline HTML tags are supported for styling.

* `<span>`
* `<sup>`
* `<sub>`
* `<em>`
* `<i>`
* `<strong>`
* `<b>`

Supported CSS styles for use with `<span>` elements:

* `color`
* `background-color`
* `font-weight: bold`
* `font-style: italic`
* `text-decoration: underline`
* `text-decoration: line-through`
* `font-family`
* `font-variant: small-caps`
* `font-size` (must use points for units)

You may also use `{style="..."}` [attributes](https://www.npmjs.com/package/markdown-it-attrs)
after markdown elements to apply styles. This can be used on headers, inline
elements, code blocks, etc.

### Emoji

Use Github style [emoji](http://www.webpagefx.com/tools/emoji-cheat-sheet/) in your text using
the `:emoji:`.

The following example inserts emoji in the header and body of the slide.

<pre>
### I :heart: cats

:heart_eyes_cat:
</pre>

### Code blocks

Both indented and fenced code blocks are supported, with syntax highlighting.

The following example renders highlighted code.

<pre>
### Hello World

```javascript
console.log('Hello world');
```
</pre>

To change the syntax highlight theme specify the `--style <theme>` option on the
command line. All [highlight.js themes](https://github.com/isagalaev/highlight.js/tree/master/src/styles)
are supported. For example, to use the github theme

```sh
md2gslides slides.md --style github
```

You can also apply additional style changes to the entire block, such as changing
the font size:

<pre>
### Hello World

```javascript
console.log('Hello world');
```{style="font-size: 36pt"}
</pre>

### Tables

Tables are supported via
[GFM](https://guides.github.com/features/mastering-markdown/#GitHub-flavored-markdown) syntax.

Note: Including tables and other block elements on the same slide may produce poor results with
overlapping elements. Either avoid or manually adjust the layout after generating the slides.

The following generates a 2x5 table on the slide.

<pre>
### Top pets in the United States

Animal | Number
-------|--------
Fish   | 142 million
Cats   | 88 million
Dogs   | 75 million
Birds  | 16 million
</pre>

### Local images

Images referencing local paths temporarily uploaded and hosted to [file.io](https://file.io). File.io
is an emphemeral file serving service that generates short-lived random URLs to the upload file and deletes
content shortly after use.

Since local images are uploaded to a thrid party, explicit opt-in is required to use this feature.
Include the `--use-fileio` option to opt-in to uploading images. This applies to file-based images as well
as automatically rasterized content like math expressions and SVGs.

### Image rasterization

Slides can also include generated images, using `$$$` fenced blocks
for the data. Currently supported generated images are math expression (TeX
and MathML) as well as SVG. Rasterized images are treated like local images are require
opt-in to uploading images to a 3rd party service via the `--use-fileio` option.

Using TeX:

<pre>
# How about some math?

$$$ math
\cos (2\theta) = \cos^2 \theta - \sin^2 \theta
$$$
</pre>

SVG

<pre>
# Or some SVG?

$$$ svg
&lt;svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 48 48">
  &lt;defs>
    &lt;path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
  &lt;/defs>
  &lt;clipPath id="b">
    &lt;use xlink:href="#a" overflow="visible"/>
  &lt;/clipPath><path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/>
  &lt;path clip-path="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/>
  &lt;path clip-path="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/>
  &lt;path clip-path="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/>
&lt;/svg>
$$$
</pre>

Like local images, generated images are temporarily served via file.io.

Pull requests for other image generators (e.g. mermaid, chartjs, etc.) are welcome!

## Reading from standard input

You can also pipe markdown into the tool by omitting the file name argument.

## Contributing

With the exception of `/bin/md2gslides.js`, TypeScript is used throughout and compiled
with [Babel](https://babeljs.io/). [Mocha](https://mochajs.org/) and [Chai](http://chaijs.com/)
are used for testing.

Before anything, ensure you have all dependencies:

```sh
npm install
```

To compile:

```sh
npm run compile
```

To run unit tests:

```sh
npm run test
```

To lint/format tests:

```sh
npm run lint
```

See [CONTRIBUTING](CONTRIBUTING.md) for additional terms.

## License

This library is licensed under Apache 2.0. Full license text is
available in [LICENSE](LICENSE).
