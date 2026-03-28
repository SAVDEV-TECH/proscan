export interface ScannedProduct {
  name: string;
  category: string;
  estimatedPrice: number;
  brand?: string;
  description?: string;
  confidence: "high" | "medium" | "low";
  source: "ai" | "firebase" | "barcode_api";
  image?: string;
}

// Convert image blob/base64 to base64 string
export async function imageToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Call Claude Vision API to identify a product from an image via internal API
export async function identifyProductWithAI(base64Image: string): Promise<ScannedProduct | null> {
  try {
    const response = await fetch("/api/scan", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: base64Image }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn("⏳ GEMINI API TOO MANY REQUESTS! You are hitting the max rate limit (15 requests per minute) on the free tier. Please pause for 60 seconds before scanning again.");
      } else {
        console.error("Scan proxy failed. Status:", response.status);
      }
      return null;
    }

    const data = await response.json();
    const text = data?.content?.[0]?.text || "";
    console.log("Raw Gemini output inside browser:", text);

    // Strip markdown fences if present
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      console.error("Failed to parse JSON:", clean);
      return null;
    }

    if (parsed.error) {
      console.warn("Gemini intentionally returned identification error:", parsed.error);
      return null;
    }

    return {
      ...parsed,
      estimatedPrice: parseFloat(String(parsed.estimatedPrice).replace(/[^0-9.]/g, '')) || 0,
      source: "ai",
    };
  } catch (err) {
    console.error("AI scan error during fetch:", err);
    return null;
  }
}

// Lookup product by barcode using Open Food Facts API
export async function lookupBarcode(barcode: string): Promise<ScannedProduct | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await res.json();

    if (data.status !== 1) return null;

    const product = data.product;
    return {
      name: product.product_name || product.abbreviated_product_name || "Unknown Product",
      category: product.categories_tags?.[0]?.replace("en:", "") || "General",
      estimatedPrice: 0, // Price not available from Open Food Facts — owner sets it
      brand: product.brands || "",
      description: product.generic_name || "",
      confidence: "high",
      source: "barcode_api",
    };
  } catch (err) {
    console.error("Barcode lookup error:", err);
    return null;
  }
}
