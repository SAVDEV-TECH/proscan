# ProScan — AI-Powered Product Scanner

A standalone Next.js app for small provision shop owners to scan products using AI and barcode recognition, add them to a cart, and generate receipts.

## Features
- AI product recognition via Claude Vision API (camera capture)
- Barcode scanning via @zxing/browser (auto-scan)
- Firebase product database lookup
- Open Food Facts API fallback for barcodes
- Cart with quantity controls
- Receipt/checkout summary with print support

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.local.example` to `.env.local` and fill in your values:
```bash
cp .env.local.example .env.local
```

Required values:
- Firebase project config (from Firebase Console > Project Settings)
- Anthropic API key (from console.anthropic.com)

### 3. Set up Firebase
In your Firebase project:
1. Create a Firestore database
2. Create a `products` collection with documents containing:
   ```
   {
     name: "Indomie Chicken Noodles",
     price: 250,
     category: "Noodles",
     brand: "Indomie",
     barcode: "5000118...",   // optional
     description: "..."       // optional
   }
   ```

### 4. Run locally
```bash
npm run dev
```
Open http://localhost:3000

### 5. Deploy to Vercel
```bash
vercel
```
Add your environment variables in the Vercel dashboard under Project > Settings > Environment Variables.

## Project Structure
```
proscan/
  app/
    page.tsx          ← Main scanner screen
    receipt/page.tsx  ← Receipt & checkout summary
    layout.tsx        ← Root layout with providers
    globals.css       ← Global styles
  components/
    Scanner.tsx       ← Camera + AI + barcode logic
    CartDrawer.tsx    ← Slide-out cart panel
  context/
    CartContext.tsx   ← Cart state management
  lib/
    firebase.ts       ← Firebase init
    aiScan.ts         ← Claude AI + barcode API calls
```

## How scanning works
1. **AI Mode**: Captures a photo from camera → sends to Claude Vision API → Claude identifies product name, category, and estimated price → searches Firebase for exact price match
2. **Barcode Mode**: Continuously reads barcode from camera feed → looks up in Firebase first → falls back to Open Food Facts global database

## Future: Merging with Mogshop
This project is designed to be merged with Mogshop later:
- Replace `CartContext` with Mogshop's existing cart
- Replace `lib/firebase.ts` with Mogshop's Firebase instance
- Add authentication from Mogshop's AuthContext
