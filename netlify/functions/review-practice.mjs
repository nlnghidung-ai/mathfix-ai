import { reviewPractice } from '../../services/openai.mjs';

export default async (request) => {
  try {
    return Response.json(await reviewPractice(await request.json()));
  } catch (error) {
    return Response.json({ message: error.message }, { status: 400 });
  }
};
