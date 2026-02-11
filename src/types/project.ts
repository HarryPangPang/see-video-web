// 项目类型
export type ProjectType = 'ai-chat' | 'url-deploy' | 'zip-deploy';

// 项目状态
export type ProjectStatus = 'draft' | 'deployed' | 'archived';

// 统一的项目数据结构
export interface Project {
    // 唯一标识
    id?: string;  // 统一使用 id，可以是 driveid 或其他唯一标识

    // 项目类型（可选，兼容旧数据）
    type?: ProjectType;

    // 平台信息
    platformId?: string;  // 平台 ID（Google AI Studio, OpenAI, etc.）

    // 模型信息
    model?: {
        label: string;
        value: number | string;
    };

    // 内容信息
    title?: string;  // 项目标题（从第一条 prompt 提取或用户设置）
    prompt?: string[];  // 对话历史的 prompt 列表
    chatContent?: string;  // 聊天内容的 DOM 字符串

    // Google AI Studio 特有字段
    driveid?: string;  // Google Drive ID（仅 ai-chat 类型）

    // 部署相关
    deployUrl?: string;  // 部署后的预览 URL
    deployType?: 'url' | 'zip';  // 部署类型

    // 元数据
    status?: ProjectStatus;
    createdAt: number;
    updatedAt?: number;

    // 文件信息（用于重新部署）
    files?: Record<string, string>;  // ZIP 部署时保存的文件
    sourceUrl?: string;  // URL 部署时的源地址
}

// 创建项目的工厂函数
export const createProject = (
    type: ProjectType,
    options: Partial<Project>
): Project => {
    const timestamp = Date.now();

    return {
        id: options.id || `project-${timestamp}`,
        type,
        platformId: options.platformId,
        model: options.model,
        title: options.title || options.prompt?.[0] || 'Untitled Project',
        prompt: options.prompt || [],
        chatContent: options.chatContent,
        driveid: options.driveid,
        deployUrl: options.deployUrl,
        deployType: options.deployType,
        status: options.status || 'draft',
        createdAt: options.createdAt || timestamp,
        updatedAt: options.updatedAt,
        files: options.files,
        sourceUrl: options.sourceUrl,
    };
};

// 判断项目是否可以继续对话
export const canContinueChat = (project: Project): boolean => {
    // 只要有 driveid 就可以继续对话（兼容旧数据没有 type 字段的情况）
    return !!project.driveid;
};

// 判断项目是否可以预览
export const canPreview = (project: Project): boolean => {
    return !!project.deployUrl;
};

// 获取项目显示标题
export const getProjectTitle = (project: Project): string => {
    // 优先使用 title，然后是第一条 prompt，最后是默认标题
    if (project.title) return project.title;

    // 处理 prompt 可能是数组或字符串的情况（兼容旧数据）
    if (Array.isArray(project.prompt) && project.prompt.length > 0) {
        return project.prompt[0];
    }

    if (typeof project.prompt === 'string') {
        return project.prompt;
    }

    return 'Untitled Project';
};

// 获取项目类型显示文本
export const getProjectTypeLabel = (type: ProjectType): string => {
    const labels: Record<ProjectType, string> = {
        'ai-chat': 'AI Chat',
        'url-deploy': 'URL Deploy',
        'zip-deploy': 'ZIP Deploy',
    };
    return labels[type];
};
