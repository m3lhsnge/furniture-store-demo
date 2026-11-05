// Resize uploads before transfer; originals are not uploaded.
export async function prepareImage(file: File): Promise<Blob> {
 if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size>10*1024*1024) throw new Error('En fazla 10 MB JPEG, PNG veya WebP seçin.')
 const bitmap=await createImageBitmap(file)
 const ratio=Math.min(1,1800/Math.max(bitmap.width,bitmap.height))
 const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio)
 canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close()
 return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Görsel hazırlanamadı.')),'image/webp',.82))
}
