import * as ImageManipulator from 'expo-image-manipulator'

export async function compressImage(uri: string): Promise<string> {
  const compStart = Date.now()
  const uriTail = uri.substring(uri.lastIndexOf('/') + 1).substring(0, 40)
  console.log(`[TIMING] Compression start — ...${uriTail}: ${compStart}ms since epoch`)
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 800 } }],
    {
      compress: 0.5,
      format: ImageManipulator.SaveFormat.JPEG,
      base64: true,
    }
  )
  const base64 = result.base64!
  const outputKB = Math.round((base64.length * 0.75) / 1024)
  console.log(`[TIMING] Compression done: +${Date.now() - compStart}ms, output ~${outputKB}KB`)
  return base64
}
