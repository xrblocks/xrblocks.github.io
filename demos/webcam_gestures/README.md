# Webcam Gestures Demo

Control XR simulator hand gestures using your webcam and MediaPipe hand tracking.

## Features

- **Real-time hand gesture detection** using MediaPipe
- **Custom gesture recognition**: PINCH, FIST, ROCK, THUMBS_UP, THUMBS_DOWN
- **Native gesture support**: POINTING, VICTORY, RELAXED
- **XR simulator integration** with stereo view
- **100ms cooldown** to prevent gesture jitter

## Supported Gestures

- **Pinch** - Thumb and index finger touch (index extended)
- **Fist** - All fingers closed, neutral thumb
- **Thumbs Up** - All fingers closed, thumb pointing up
- **Thumbs Down** - All fingers closed, thumb pointing down
- **Rock** - Index and pinky extended, middle and ring closed
- **Pointing** - Index finger pointing up
- **Victory** - Peace sign
- **Relaxed** - Open palm

## How it Works

1. MediaPipe detects hand landmarks from webcam feed
2. Custom heuristics detect gestures from landmark positions
3. Fallback to MediaPipe's native gesture recognition
4. Detected gestures trigger corresponding XR simulator hand poses
