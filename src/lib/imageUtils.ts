/** Image resize utility (creates a resized File) */
export async function resizeImage(file: File, maxSize = 1024): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const { width, height } = img
      const ratio = Math.min(1, maxSize / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        reject(new Error('Canvas not supported'))
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { URL.revokeObjectURL(url); reject(new Error('Canvas toBlob failed')); return }
        const resizedFile = new File([blob], file.name, { type: blob.type })
        URL.revokeObjectURL(url)
        resolve(resizedFile)
      }, file.type || 'image/jpeg', 0.9)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load error')) }
    img.src = url
  })
}
