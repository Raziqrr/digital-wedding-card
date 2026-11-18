# Digital wedding card (demo)

A bilingual (BM / EN) digital wedding card for phones: a 3D envelope cover, a pelamin curtain (tirai) you part with your finger, and a page whose ground is a live shader songket cloth. React 19, Vite, three.js / react-three-fiber, motion, and raw WebGL2.

The couple, venue and all details are fictional.

```
npm install
npm run dev
```

Useful URL options: `?skip=1` skips the envelope, `?tirai=0` drops the curtain, `?lang=en` starts in English, `?to=Name` greets a guest, `?now=2027-03-20T11:00:00%2B08:00` previews the wedding-day states.

Quiet mode (the "Ringkas" button), an OS reduced-motion setting, a missing WebGL2, or a slow GPU all fall back to a plain CSS version. There is no sound.
