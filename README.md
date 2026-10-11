# Zelda

Browser SNES player for [zelda.jonbailey.xyz](https://zelda.jonbailey.xyz/).

You choose a cartridge file on your device. The site does not host one. Saves stay in that browser.

Controls: keyboard, a standard controller, and on-screen buttons for mouse and touch.

Emulation is [EmulatorJS](https://emulatorjs.org/) (snes9x core), loaded from their CDN. This repo is the player shell only.

```powershell
py -3 scripts\generate_og_card.py
powershell -ExecutionPolicy Bypass -File deploy.ps1
```

License: MIT for this shell. snes9x has its own non-commercial license. Do not add `.sfc`, `.smc`, or other cartridge files.
