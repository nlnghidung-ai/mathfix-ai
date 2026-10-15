import { scanImage, analyzeImage } from '../../services/openai.mjs';

export default async (request) => {
  try {
    const body = await request.json();
    if (body.action === 'scan') {
      return Response.json(await scanImage(body.image));
    }
    return Response.json(await analyzeImage(body.image, body.transcribed));
  } catch (error) {
    return Response.json({ readable: false, needsRetake: true, message: error.message, errors: [], exercises: [] }, { status: 400 });
  }
};
