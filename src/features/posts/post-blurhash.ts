import { encode } from "blurhash";

const DEFAULT_COMPONENTS = { x: 4, y: 3 } as const;

/**
 * Creates a real BlurHash from the prepared browser image. This is a visual
 * placeholder only; the server remains authoritative for persisted media
 * metadata.
 */
export async function generatePostBlurhash(
  file: Blob,
  components = DEFAULT_COMPONENTS,
): Promise<string> {
  if (typeof document === "undefined") {
    throw new Error("BlurHash generation requires a browser environment.");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    const width = Math.min(image.naturalWidth, 64);
    const height = Math.min(image.naturalHeight, 64);
    if (!width || !height) throw new Error("Unable to read image dimensions.");

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) throw new Error("Unable to create image processing context.");

    context.drawImage(image, 0, 0, width, height);
    const { data } = context.getImageData(0, 0, width, height);
    return encode(data, width, height, components.x, components.y);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to decode image."));
    image.src = url;
  });
}
