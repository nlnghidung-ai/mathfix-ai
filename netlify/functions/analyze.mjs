import { analyzeImage } from '../../services/openai.mjs';

export default async (request) => {
  try {
    const { image } = await request.json();
    return Response.json(await analyzeImage(image));
  } catch (error) {
    return Response.json({ readable: false, needsRetake: true, message: error.message, errors: [], exercises: [] }, { status: 400 });
  }
};
