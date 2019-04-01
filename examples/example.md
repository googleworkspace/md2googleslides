---

# This is a title slide

## Your name here

<!--
This only appears as a speaker note.
-->

---

# Section title slide

---

# Title & body slide

This is the slide body.

Text can be styled for:

* *emphasis*
* **strong emphasis**
* ~~strikethrough~~
* `fixed width code fonts`

Slides :heart: [links](https://developers.google.com/slides) too!

---

# Section title & body slide

## This is a subtitle

This is the body

---

# This is the main point {.big}

---

# 100% {.big}

This is the body

---

# Two column layout

This is the *left* column

{.column}

This is the *right* column

---

# Slides can have background images

![](https://picsum.photos/g/1600/900){.background}

---

# Slides can have an inline image

![](https://picsum.photos/1600/900)

---

# Slides can have many images

![](https://www.gstatic.com/images/branding/product/2x/drive_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/docs_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/sheets_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/slides_36dp.png){pad=10}
![](https://www.gstatic.com/images/branding/product/2x/forms_36dp.png){pad=10}

---

# Slides can have local images 

![](file://image_slide.png)

---

# Slides can have videos

@[youtube](QBcHT0XJRP8)


---
# Slides can have code

```javascript
// Print hello
function hello() {
  console.log('Hello world');
}
```

---
# Code can be big...

```javascript {style="font-size: 36pt"}
// Print hello
function hello() {
  console.log('Hello big world');
}
```

---
# ... or small

```javascript {style="font-size: 8pt}
// Print hello
function hello() {
  console.log('Hello little world');
}
```

---
# Slides can have tables

Animal | Number
-------|--------
Fish   | 142 million
Cats   | 88 million
Dogs   | 75 million
Birds  | 16 million

---
# Some inline HTML and CSS is supported

Use <span style="color:red">span</span> to color text.

Use <sup>superscript</sup> and <sub>subscript</sub>, <span style="text-decoration: line-through">strikethrough</span>
or <span style="text-decoration: underline">underline</span>, even <span style="font-variant: small-caps">small caps.</span>

---
# How about some math?

$$$ math
\cos (2\theta) = \cos^2 \theta - \sin^2 \theta
$$$

---
# Or some SVG?

$$$ svg
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 48 48"><defs><path id="a" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/></defs><clipPath id="b"><use xlink:href="#a" overflow="visible"/></clipPath><path clip-path="url(#b)" fill="#FBBC05" d="M0 37V11l17 13z"/><path clip-path="url(#b)" fill="#EA4335" d="M0 11l17 13 7-6.1L48 14V0H0z"/><path clip-path="url(#b)" fill="#34A853" d="M0 37l30-23 7.9 1L48 0v48H0z"/><path clip-path="url(#b)" fill="#4285F4" d="M48 48L17 24l-4-3 35-10z"/></svg>
$$$