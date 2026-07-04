const fs = require('fs');
const path = require('path');

const DEFAULT_LOCAL_ROOT = path.join(__dirname, '..', 'uploads');
const DEFAULT_RENDER_ROOT = '/var/data/uploads';

const uniquePaths = (paths) => {
    const seen = new Set();
    return paths.filter((item) => {
        const key = path.resolve(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
};

const getPrimaryUploadRoot = () => {
    const configuredRoot = process.env.UPLOAD_STORAGE_DIR || process.env.RENDER_DISK_MOUNT_PATH;
    if (configuredRoot) {
        return path.resolve(configuredRoot);
    }

    if (process.env.RENDER === 'true') {
        return path.resolve(DEFAULT_RENDER_ROOT);
    }

    return path.resolve(DEFAULT_LOCAL_ROOT);
};

const getUploadRoots = () => {
    const primaryRoot = getPrimaryUploadRoot();
    const roots = [primaryRoot];

    if (process.env.RENDER === 'true') {
        roots.push(path.resolve(DEFAULT_RENDER_ROOT));
    }

    roots.push(path.resolve(DEFAULT_LOCAL_ROOT));

    return uniquePaths(roots);
};

const ensureUploadDir = (...segments) => {
    const targetDir = path.join(getPrimaryUploadRoot(), ...segments.filter(Boolean));
    fs.mkdirSync(targetDir, { recursive: true });
    return targetDir;
};

const normalizePublicUploadPath = (value) => {
    if (!value) return '';

    const normalized = String(value).trim().replace(/\\/g, '/').split('?')[0].split('#')[0];
    if (/^https?:\/\//i.test(normalized)) {
        return normalized;
    }

    const withoutLeadingSlash = normalized.replace(/^\/+/, '');
    if (withoutLeadingSlash.startsWith('uploads/')) {
        return `/${withoutLeadingSlash}`;
    }

    return `/${withoutLeadingSlash}`;
};

const toPublicUploadPath = (relativePath) => {
    const normalized = String(relativePath || '').trim().replace(/\\/g, '/').replace(/^\/+/, '');
    if (!normalized) return '/uploads';
    if (normalized.startsWith('uploads/')) {
        return `/${normalized}`;
    }
    return `/uploads/${normalized}`;
};

const resolveUploadedFilePath = (publicPath) => {
    const normalized = normalizePublicUploadPath(publicPath);
    const relative = normalized.replace(/^\/+/, '');

    const relativeToRoot = relative.startsWith('uploads/')
        ? relative.slice('uploads/'.length)
        : relative;

    const roots = getUploadRoots();
    for (const root of roots) {
        const targetPath = path.resolve(root, relativeToRoot);
        const rootWithSep = root.endsWith(path.sep) ? root : `${root}${path.sep}`;
        if (targetPath !== root && !targetPath.startsWith(rootWithSep)) {
            continue;
        }
        if (fs.existsSync(targetPath)) {
            return targetPath;
        }
    }

    return path.resolve(roots[0], relativeToRoot);
};

module.exports = {
    getPrimaryUploadRoot,
    getUploadRoots,
    ensureUploadDir,
    normalizePublicUploadPath,
    toPublicUploadPath,
    resolveUploadedFilePath,
};