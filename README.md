# Better Rail Website

In this repository you'll be able to find the source code of the Better Rail website.  
The source code for the app itself can be found [here](https://github.com/better-rail/app).

There are no build tools needed to build the website, it's just plain ol' HTML & CSS files.

## Local Development

Because static assets and stylesheets are referenced using absolute paths (e.g., `/style.css`), the website should be served via a local web server so all resources resolve properly:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

If you're using VSCode, you can also use the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension while developing for automatic live-reloading.
