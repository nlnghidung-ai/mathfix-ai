/** Các class nghiệp vụ cho demo Học thông minh mỗi ngày. */
class Student { constructor(id,name,grade){Object.assign(this,{id,name,grade,points:0,streak:1,badges:[]})} }
class Subject { constructor(id,name,icon){Object.assign(this,{id,name,icon})} }
class KnowledgePoint { constructor(id,topicId,name){Object.assign(this,{id,topicId,name})} }
class Assessment { constructor(id,topicId,title,questions){Object.assign(this,{id,topicId,title,questions})} }
class LearningError { constructor(question,answer,explanation,knowledgePoint,severity){Object.assign(this,{question,answer,explanation,knowledgePoint,severity})} }
class LearningPath { constructor(topicId,steps){Object.assign(this,{topicId,steps,currentStep:1})} }
class LearningResource { constructor(title,content){Object.assign(this,{title,content})} }
class AIRecommendation { constructor(message,kind='normal'){Object.assign(this,{message,kind})} }
window.Domain={Student,Subject,KnowledgePoint,Assessment,LearningError,LearningPath,LearningResource,AIRecommendation};
