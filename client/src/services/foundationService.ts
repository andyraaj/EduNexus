import api from './api';

export interface InstitutionSettings {
    _id?: string;
    name: string;
    code: string;
    logoUrl?: string;
    website?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    activeAcademicYear: string;
    attendanceThreshold: number;
    defaultCurrency: string;
    gradingScheme: 'marks' | 'gpa' | 'cgpa';
}

export interface Department {
    _id: string;
    code: string;
    name: string;
    description?: string;
    headOfDepartment?: any;
    isActive: boolean;
}

export interface Program {
    _id: string;
    code: string;
    name: string;
    department: Department;
    level: string;
    durationSemesters: number;
    isActive: boolean;
}

export interface Batch {
    _id: string;
    name: string;
    program: Program;
    academicYear: string;
    startYear: number;
    endYear: number;
    isActive: boolean;
}

export interface Section {
    _id: string;
    name: string;
    batch: Batch;
    semester: number;
    classAdvisor?: any;
    room?: string;
    capacity: number;
    isActive: boolean;
}

export const getInstitutionSettings = (token: string): Promise<{ settings: InstitutionSettings }> =>
    api.get('/foundation/settings', token);

export const updateInstitutionSettings = (token: string, payload: Partial<InstitutionSettings>): Promise<{ settings: InstitutionSettings }> =>
    api.put('/foundation/settings', payload as Record<string, unknown>, token);

export const listDepartments = (token: string): Promise<{ departments: Department[] }> =>
    api.get('/foundation/departments?isActive=all', token);

export const createDepartment = (token: string, payload: Partial<Department>): Promise<{ department: Department }> =>
    api.post('/foundation/departments', payload as Record<string, unknown>, token);

export const updateDepartment = (token: string, id: string, payload: Partial<Department>): Promise<{ department: Department }> =>
    api.put(`/foundation/departments/${id}`, payload as Record<string, unknown>, token);

export const listPrograms = (token: string): Promise<{ programs: Program[] }> =>
    api.get('/foundation/programs?isActive=all', token);

export const createProgram = (token: string, payload: Record<string, unknown>): Promise<{ program: Program }> =>
    api.post('/foundation/programs', payload, token);

export const updateProgram = (token: string, id: string, payload: Record<string, unknown>): Promise<{ program: Program }> =>
    api.put(`/foundation/programs/${id}`, payload, token);

export const listBatches = (token: string): Promise<{ batches: Batch[] }> =>
    api.get('/foundation/batches?isActive=all', token);

export const createBatch = (token: string, payload: Record<string, unknown>): Promise<{ batch: Batch }> =>
    api.post('/foundation/batches', payload, token);

export const updateBatch = (token: string, id: string, payload: Record<string, unknown>): Promise<{ batch: Batch }> =>
    api.put(`/foundation/batches/${id}`, payload, token);

export const listSections = (token: string): Promise<{ sections: Section[] }> =>
    api.get('/foundation/sections?isActive=all', token);

export const createSection = (token: string, payload: Record<string, unknown>): Promise<{ section: Section }> =>
    api.post('/foundation/sections', payload, token);

export const updateSection = (token: string, id: string, payload: Record<string, unknown>): Promise<{ section: Section }> =>
    api.put(`/foundation/sections/${id}`, payload, token);
