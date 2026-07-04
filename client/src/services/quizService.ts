import api from './api';

export interface Question {
    _id?: string;
    questionId?: string;
    text: string;
    options: string[];
    correctOptionIndex: number;
    marks?: number;
}

export interface Quiz {
    _id: string;
    course: string;
    faculty: string;
    title: string;
    description: string;
    timeLimitMinutes: number;
    isActive: boolean;
    questions: Question[];
    createdAt: string;
}

export interface QuizAttempt {
    _id: string;
    quiz: string | Quiz;
    student: any;
    answers: Record<string, number>;
    score: number;
    startTime: string;
    endTime: string | null;
}

// ── Quizzes (Faculty) ───────────────────────────────────────────────────────
export const fetchQuizzes = (token: string, courseId: string): Promise<{ quizzes: Quiz[] }> =>
    api.get(`/quizzes/course/${courseId}`, token);

export const createQuiz = (token: string, data: Partial<Quiz>): Promise<{ quiz: Quiz }> =>
    api.post('/quizzes', data as Record<string, unknown>, token);

export const updateQuiz = (token: string, id: string, data: Partial<Quiz>): Promise<{ quiz: Quiz }> =>
    api.put(`/quizzes/${id}`, data as Record<string, unknown>, token);

export const deleteQuiz = (token: string, id: string): Promise<void> =>
    api.delete(`/quizzes/${id}`, token);

// ── Attempts (Student & Faculty) ───────────────────────────────────────────
export const startQuiz = (token: string, quizId: string): Promise<{ attempt: QuizAttempt }> =>
    api.post(`/attempts/${quizId}/start`, {}, token);

export const submitQuiz = (token: string, quizId: string, answers: Record<string, number>): Promise<{ score: number; totalQuestions: number; attemptId: string }> =>
    api.post(`/attempts/${quizId}/submit`, { answers }, token);

export const fetchMyAttempts = (token: string): Promise<{ attempts: QuizAttempt[] }> =>
    api.get('/attempts/my-attempts', token);

export const fetchQuizAttemptsForFaculty = (token: string, quizId: string): Promise<{ attempts: QuizAttempt[] }> =>
    api.get(`/attempts/quiz/${quizId}`, token);
