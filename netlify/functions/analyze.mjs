import { scanImage, analyzeImage, recheckStep, gradePractice } from '../../services/openai.mjs';

export default async (request) => {
  try {
    const body = await request.json();
    if (body.action === 'scan') {
      return Response.json(await scanImage(body.image));
    }
    if (body.action === 'recheck') {
      return Response.json(await recheckStep(body.data));
    }
    if (body.action === 'grade-practice') {
      return Response.json(await gradePractice(body.data));
    }
    return Response.json(await analyzeImage(body.image, body.transcribed));
  } catch (error) {
    return Response.json({ readable: false, needsRetake: true, message: error.message, errors: [], exercises: [] }, { status: 400 });
  }
};
