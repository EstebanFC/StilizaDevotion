import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * Genera una imagen PNG real del código QR en:
 * GET /api/qr/[token]
 * Esto permite que WhatsApp (Meta Cloud API o Twilio) envíe la imagen del QR
 * directamente al celular del usuario como archivo multimedia.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const cleanToken = decodeURIComponent(token || "SD-2026-DEMO");

    const pngBuffer = await QRCode.toBuffer(cleanToken, {
      type: "png",
      width: 500,
      margin: 2,
      color: {
        dark: "#1B1512",
        light: "#FDFBF9",
      },
    });

    return new NextResponse(new Uint8Array(pngBuffer), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error generando QR PNG" },
      { status: 500 }
    );
  }
}
