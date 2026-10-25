# Mi Box Remote Backend

This repository root contains the Node.js API that relays requests between the Netlify companion page and the Mi Box. The existing `render-backend-deploy/` folder is kept as uploaded; Render should run from the repository root where `package.json` and `server.js` now live.

## Render settings

- Root Directory: blank
- Build Command: `npm install`
- Start Command: `npm start`

`render.yaml` also defines these commands and generates two separate secrets: `PHONE_TOKEN` and `TV_TOKEN`. If you created the service manually, add both environment variables yourself with different long random values.

## Connect the devices

1. Copy the Render service URL and both secrets.
2. On the Mi Box local companion page (`http://<Mi-Box-IP>:8765/`), pair the phone if needed. On Home, expand **Connect Render backend** and enter the URL and `TV_TOKEN`.
3. Deploy the contents of `launcher/app/src/main/assets/remote/` to Netlify. On the Netlify page, enter the same URL and `PHONE_TOKEN`.

The Mi Box polls the service outbound over HTTPS. Supported actions: TV Home, app list/open, and wallpaper upload. D-pad control is not included. Keep both tokens private. Render Free instance hours are used while the TV bridge keeps the service active.
