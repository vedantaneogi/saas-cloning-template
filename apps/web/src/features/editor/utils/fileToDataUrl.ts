/**
 * Read a File/Blob as a base64 `data:` URL. We use this instead of
 * `URL.createObjectURL` for any image that gets stored in the deck model:
 * blob URLs are tied to the current JS context, so they break across page
 * reloads and also fail the XHR path that pptxgenjs uses when exporting.
 */
export function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") resolve(result);
      else reject(new Error("FileReader did not return a string"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("FileReader failed"));
    reader.readAsDataURL(file);
  });
}
