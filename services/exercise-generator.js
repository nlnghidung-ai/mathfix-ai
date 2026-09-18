(function (global) {
  const levels = ['BASIC', 'BASIC', 'BASIC', 'STANDARD', 'STANDARD', 'STANDARD', 'STANDARD', 'ADVANCED', 'ADVANCED', 'CHALLENGE'];
  const types = ['multiple_choice', 'fill_blank', 'calculation', 'reasoning', 'application', 'find_error', 'word_problem', 'reasoning', 'application', 'challenge'];
  function create(lesson, rawQuestions) {
    if (!lesson) return { status: 'CURRICULUM_VALIDATION_FAILED', reason: 'Không tìm thấy bài trong curriculum', exercises: [] };
    if (!Array.isArray(rawQuestions) || rawQuestions.length !== 10) return { status: 'CURRICULUM_VALIDATION_FAILED', reason: 'Bộ bài tập phải có đúng 10 câu', exercises: [] };
    const exercises = rawQuestions.map((question, index) => ({
      id: `${lesson.id}_ex_${index + 1}`, grade: lesson.grade, lesson_id: lesson.id,
      knowledge_point_ids: [lesson.knowledgePoints[Math.min(index % lesson.knowledgePoints.length, lesson.knowledgePoints.length - 1)].id],
      difficulty: levels[index], exercise_type: types[index], question: question.text,
      solution: question.hint, choices: question.choices, answer: question.answer,
      skills_required: [lesson.allowedSkills[0]]
    }));
    for (const exercise of exercises) { const error = global.ExerciseValidators.curriculumValidator(exercise, lesson) || global.ExerciseValidators.difficultyValidator(exercise); if (error) return { status: 'CURRICULUM_VALIDATION_FAILED', reason: error, exercise_id: exercise.id, exercises: [] }; }
    const duplicateError = global.ExerciseValidators.duplicateValidator(exercises);
    if (duplicateError) return { status: 'CURRICULUM_VALIDATION_FAILED', reason: duplicateError, exercises: [] };
    return { status: 'OK', exercises };
  }
  global.ExerciseGenerator = { create };
})(window);
