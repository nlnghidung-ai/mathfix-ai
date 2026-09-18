(function (global) {
  const forbiddenPatterns = { linear_equation: /thì\s*[a-z]\s*bằng|giải\s*phương\s*trình/i, quadratic_equation: /phương trình bậc hai/i, polynomial: /đa thức/i };
  const normalize = text => String(text).toLowerCase().replace(/\s+/g, ' ').trim();
  function curriculumValidator(exercise, lesson) {
    if (exercise.grade !== lesson.grade) return 'Sai khối lớp';
    if (exercise.lesson_id !== lesson.id) return 'Sai bài học';
    if (!exercise.knowledge_point_ids.every(id => lesson.knowledgePoints.some(kp => kp.id === id))) return 'Sai knowledge point';
    if (!exercise.skills_required.every(skill => lesson.allowedSkills.includes(skill) || lesson.prerequisites.includes(skill))) return 'Kỹ năng không được phép';
    if (lesson.forbiddenSkills.some(skill => forbiddenPatterns[skill] && forbiddenPatterns[skill].test(exercise.question))) return 'Có kiến thức bị cấm';
    return null;
  }
  function difficultyValidator(exercise) { return global.CurriculumTypes.validDifficulty.has(exercise.difficulty) ? null : 'Độ khó không hợp lệ'; }
  function duplicateValidator(exercises) {
    const seen = new Set();
    for (const exercise of exercises) { const key = `${exercise.exercise_type}:${normalize(exercise.question)}`; if (seen.has(key)) return 'Các câu hỏi trùng cấu trúc'; seen.add(key); }
    return null;
  }
  global.ExerciseValidators = { curriculumValidator, difficultyValidator, duplicateValidator };
})(window);
