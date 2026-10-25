# Mi Box companion backend

This standalone folder is the Render backend for the Netlify phone page.

## Deploy

1. Extract this folder and put its four files at the root of a GitHub repository.
2. In Render, choose **New → Blueprint** and connect that repository. Render reads `render.yaml` and creates the web service.
3. In the service's Environment page, copy the generated `PHONE_TOKEN` and `TV_TOKEN` privately.
4. Install the updated TV Home APK. Open the local TV companion page, pair it, expand **Connect Render backend**, then save the Render URL and `TV_TOKEN`.
5. Redeploy `launcher/app/src/main/assets/remote/` to Netlify. Open the Netlify page and save the same Render URL and `PHONE_TOKEN`.

Use a URL such as `https://mi-box-companion-api.onrender.com`, without a trailing slash. Do not publish the tokens. The Mi Box makes outbound HTTPS polling requests; Render does not need access to your home Wi-Fi. Supported actions are TV Home, viewing/opening apps, and changing wallpaper. D-pad control is not included.

The TV bridge polls about every two seconds while enabled to keep Render awake and limit command pickup delay. Render's Free instance hours count while the service is awake, so this is best for personal use rather than an always-on production service. Both phone and TV need internet access.
