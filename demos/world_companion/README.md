# World Companion

A live AR companion that watches and listens, then drops markers on things
you ask about, no pinching, no tapping. Just talk.

Open a Gemini Live session with the camera streaming, and the model decides
when to mark something. Say "find my keys" or "what's that on the shelf"
and it places a label on the matched object. The model picks the marker
style: `dot` for casual notes, `arrow` for pointing things out, `pulse`
for small or hard-to-spot things.

You can ask for several things at once ("label the couch, tv, and coffee
table") and they all get placed in a single call via the tool's `items[]`
array, each with its own style. Labels billboard to the camera so they
stay readable as you move around.

Object names from the detector and what you say don't always line up:
"television" vs "tv", "pendant light" vs "floor lamp", "picture" vs
"painting". Token overlap catches the easy ones, then we fall back to a
small embedding pass (Gemini `embedContent`) to match by meaning and
dedupe markers across rephrasings, with a per-page cache so it's mostly
free after the first call.

## How it differs from Gemini-XRObject

[Gemini-XRObject](https://xrblocks.github.io/docs/samples/Gemini-XRObject/)
is a one-shot flow: long-pinch → detect what you're holding → tap → ask a
question.

World Companion is the opposite. Gemini Live is always listening and
seeing, and it decides when to drop a marker mid-conversation. There's no
gesture trigger; you just speak. Items the detector can't find aren't
placed at random, they come back as `anchored: false` so the model can
say "I don't see that."

## What's new in the SDK

The always-on loop runs on the existing Gemini Live addon,
`GeminiManager.startGeminiLive`, which streams the device camera into the
session and routes tool calls back. This demo adds an optional camera
downscale (`cameraWidth` / `cameraHeight`) so the frames sent to the model
stay small. The `placeLabel` and `lookCloser` tools are registered on the
manager, and `lookCloser` uses `user.getReticleTarget()` to answer "what is
the user pointing at right now".

Gemini-XRObject doesn't need the live loop since it's request/response.

## Running

Serve the repo root and open `/demos/world_companion/`. Works in the
simulator and on Android XR.
