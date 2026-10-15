import { generateExercises } from '../../services/openai.mjs';

export default async (request) => {
  try {
    const data = await request.json();
    return Response.json(await generateExercises(data));
  } catch (error) {
    return Response.json({ exercises: [], message: error.message }, { status: 400 });
  }
};
