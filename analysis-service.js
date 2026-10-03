export async function analyzeHomework(imageDataUrl) {
  const response = await fetch('/api/analyze', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageDataUrl })
  });
  if (!response.ok) throw new Error('Không thể kết nối dịch vụ phân tích.');
  return response.json();
}
